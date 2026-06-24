import { useEffect, useState, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { getMe, ApiError } from "../../lib/api"

type Comercio = {
  id: string
  nombre: string
  email: string
  cuit?: string
  telefono?: string
  ciudad?: string
  provincia?: string
  condicion_fiscal?: string
  estado: string
}

export default function PerfilTab() {
  const { token, logout } = useAuth()
  const [comercio, setComercio] = useState<Comercio | null>(null)
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getMe(token)
      setComercio(data.comercio)
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { cargar() }, [token]))

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Confirmás que querés salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: logout },
    ])
  }

  const estadoColor = (e: string) => {
    if (e === "aprobado") return "#15803d"
    if (e === "pendiente") return "#92400e"
    if (e === "suspendido") return "#991b1b"
    return "#6b7280"
  }

  const estadoBg = (e: string) => {
    if (e === "aprobado") return "#f0fdf4"
    if (e === "pendiente") return "#fef3c7"
    if (e === "suspendido") return "#fef2f2"
    return "#f9fafb"
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Mi Perfil</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" size="large" />
      ) : comercio ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Avatar + nombre */}
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{comercio.nombre[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.nombre}>{comercio.nombre}</Text>
            <View style={[styles.estadoBadge, { backgroundColor: estadoBg(comercio.estado) }]}>
              <Text style={[styles.estadoText, { color: estadoColor(comercio.estado) }]}>
                {comercio.estado.charAt(0).toUpperCase() + comercio.estado.slice(1)}
              </Text>
            </View>
          </View>

          {/* Datos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información de la cuenta</Text>

            <Fila label="Email" valor={comercio.email} />
            {comercio.cuit && <Fila label="CUIT" valor={comercio.cuit} />}
            {comercio.telefono && <Fila label="Teléfono" valor={comercio.telefono} />}
            {(comercio.ciudad || comercio.provincia) && (
              <Fila
                label="Ubicación"
                valor={[comercio.ciudad, comercio.provincia].filter(Boolean).join(", ")}
              />
            )}
            {comercio.condicion_fiscal && (
              <Fila label="Condición fiscal" valor={comercio.condicion_fiscal} />
            )}
          </View>

          {/* Cerrar sesión */}
          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
            <Text style={styles.btnLogoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No se pudo cargar el perfil</Text>
          <TouchableOpacity onPress={cargar} style={styles.btnRetry}>
            <Text style={styles.btnRetryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  nav: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  scroll: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  nombre: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" },
  estadoBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  estadoText: { fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  filaLabel: { fontSize: 14, color: "#6b7280", flex: 1 },
  filaValor: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 2, textAlign: "right" },
  btnLogout: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  btnLogoutText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 15 },
  btnRetry: { backgroundColor: "#2563eb", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  btnRetryText: { color: "#fff", fontWeight: "700" },
})
