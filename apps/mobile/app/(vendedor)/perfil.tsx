import { useCallback, useState } from "react"
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Location from "expo-location"
import { useAuth } from "../../lib/auth"
import { getMeVendedor, actualizarUbicacion, ApiError } from "../../lib/api"
import { BACKEND_URL } from "../../lib/config"

type Vendedor = {
  id: string
  nombre: string
  apellido: string
  email: string
  celular?: string
  lat?: number
  lng?: number
  ultima_ubicacion?: string
}

export default function PerfilVendedorTab() {
  const { token, logout } = useAuth()
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [mayorista, setMayorista] = useState<{ nombre: string; logo_url?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)

  const cargar = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getMeVendedor(token)
      setVendedor(data.vendedor)
      setMayorista(data.mayorista)
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { cargar() }, [token]))

  const handleActualizarUbicacion = async () => {
    setActualizando(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Habilitá la ubicación en la configuración del dispositivo.")
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      if (!token) return
      await actualizarUbicacion(token, loc.coords.latitude, loc.coords.longitude)
      Alert.alert("✓ Ubicación actualizada", `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`)
      cargar()
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo actualizar la ubicación")
    } finally {
      setActualizando(false)
    }
  }

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Confirmás que querés salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: logout },
    ])
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Mi Perfil</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#059669" size="large" />
      ) : vendedor ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Avatar */}
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{vendedor.nombre[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.nombre}>{vendedor.nombre} {vendedor.apellido}</Text>
            <View style={styles.rolBadge}>
              <Text style={styles.rolText}>🧑‍💼 Vendedor</Text>
            </View>
            {mayorista && (
              <Text style={styles.mayoristaNombre}>{mayorista.nombre}</Text>
            )}
          </View>

          {/* Datos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mis datos</Text>
            {vendedor.email && <Fila label="Email" valor={vendedor.email} />}
            {vendedor.celular && <Fila label="Celular" valor={vendedor.celular} />}
          </View>

          {/* GPS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mi ubicación</Text>
            {vendedor.lat && vendedor.lng ? (
              <>
                <Fila label="Lat" valor={vendedor.lat.toFixed(5)} />
                <Fila label="Lng" valor={vendedor.lng.toFixed(5)} />
                {vendedor.ultima_ubicacion && (
                  <Fila
                    label="Última actualización"
                    valor={new Date(vendedor.ultima_ubicacion).toLocaleString("es-AR")}
                  />
                )}
              </>
            ) : (
              <Text style={styles.sinUbicacion}>Sin ubicación registrada</Text>
            )}
            <TouchableOpacity
              style={[styles.btnGps, actualizando && styles.btnDisabled]}
              onPress={handleActualizarUbicacion}
              disabled={actualizando}
            >
              {actualizando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnGpsText}>📍 Actualizar ubicación ahora</Text>
              }
            </TouchableOpacity>
            <Text style={styles.gpsHint}>La ubicación se actualiza automáticamente cada 5 minutos mientras usás la app.</Text>
          </View>

          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
            <Text style={styles.btnLogoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
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
  root: { flex: 1, backgroundColor: "#f0fdf4" },
  nav: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  scroll: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  nombre: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" },
  rolBadge: { backgroundColor: "#d1fae5", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 6 },
  rolText: { fontSize: 13, fontWeight: "700", color: "#059669" },
  mayoristaNombre: { fontSize: 14, color: "#6b7280" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  filaLabel: { fontSize: 14, color: "#6b7280", flex: 1 },
  filaValor: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 2, textAlign: "right" },
  sinUbicacion: { color: "#9ca3af", fontSize: 14, marginBottom: 12, fontStyle: "italic" },
  btnGps: { backgroundColor: "#059669", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  btnGpsText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  gpsHint: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 8, lineHeight: 17 },
  btnLogout: { backgroundColor: "#fef2f2", borderRadius: 14, padding: 15, alignItems: "center", borderWidth: 1, borderColor: "#fecaca" },
  btnLogoutText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
})
