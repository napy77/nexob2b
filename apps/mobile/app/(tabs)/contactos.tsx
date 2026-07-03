import { useEffect, useState, useCallback } from "react"
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Linking, Alert,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { getMayoristas, ApiError } from "../../lib/api"
import { BACKEND_URL } from "../../lib/config"

type Mayorista = {
  id: string
  nombre: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  logo_url?: string | null
  solicitud: { id: string; estado: string } | null
  contacto: {
    nombre: string
    celular: string | null
    email: string | null
    es_vendedor: boolean
  }
}

export default function ContactosTab() {
  const router = useRouter()
  const { token, logout } = useAuth()
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getMayoristas(token)
      // Solo los aceptados en esta tab
      const aceptados = (data.mayoristas || []).filter(
        (m: Mayorista) => m.solicitud?.estado === "aceptado"
      )
      setMayoristas(aceptados)
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { cargar() }, [token]))

  const renderItem = ({ item: m }: { item: Mayorista }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.logoBox}>
          {m.logo_url
            ? <Image source={{ uri: `${BACKEND_URL}${m.logo_url}` }} style={styles.logo} resizeMode="contain" />
            : <Text style={styles.logoInitial}>{m.nombre[0]}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombre}>{m.nombre}</Text>
          {(m.ciudad || m.provincia) && (
            <Text style={styles.ubicacion}>{[m.ciudad, m.provincia].filter(Boolean).join(", ")}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.btnCatalogo}
          onPress={() => router.push(`/catalogo/${m.id}?nombre=${encodeURIComponent(m.nombre)}`)}
        >
          <Text style={styles.btnCatalogoText}>Ver catálogo</Text>
        </TouchableOpacity>
      </View>

      {/* Contacto (vendedor o mayorista) */}
      <View style={styles.contactoBox}>
        <Text style={styles.contactoTitulo}>
          {m.contacto.es_vendedor ? "🧑‍💼 Tu ejecutivo de ventas" : "📞 Contacto"}
        </Text>
        <Text style={styles.contactoNombre}>{m.contacto.nombre}</Text>
        <View style={styles.contactoBtns}>
          {m.contacto.celular && (
            <TouchableOpacity
              style={styles.btnWsp}
              onPress={() =>
                Linking.openURL(
                  `https://wa.me/${m.contacto.celular!.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hola${m.contacto.es_vendedor ? ` ${m.contacto.nombre}` : ""}! Soy cliente de ${m.nombre} en Nexo B2B.`
                  )}`
                )
              }
            >
              <Text style={styles.btnWspText}>💬 {m.contacto.celular}</Text>
            </TouchableOpacity>
          )}
          {m.contacto.email && (
            <TouchableOpacity
              style={styles.btnEmail}
              onPress={() => Linking.openURL(`mailto:${m.contacto.email}`)}
            >
              <Text style={styles.btnEmailText}>✉️ {m.contacto.email}</Text>
            </TouchableOpacity>
          )}
          {!m.contacto.celular && !m.contacto.email && (
            <Text style={styles.sinContacto}>Sin datos de contacto</Text>
          )}
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Contactos</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" size="large" />
      ) : (
        <FlatList
          data={mayoristas}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshing={loading}
          onRefresh={cargar}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🤝</Text>
              <Text style={styles.emptyTitle}>Sin contactos aprobados</Text>
              <Text style={styles.emptyText}>Solicitá alta a mayoristas desde el Catálogo</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  logo: { width: 48, height: 48 },
  logoInitial: { fontSize: 22, fontWeight: "700", color: "#2563eb" },
  nombre: { fontSize: 15, fontWeight: "700", color: "#111827" },
  ubicacion: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  btnCatalogo: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
  },
  btnCatalogoText: { color: "#2563eb", fontWeight: "700", fontSize: 12 },
  contactoBox: { padding: 14 },
  contactoTitulo: { fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  contactoNombre: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 10 },
  contactoBtns: { gap: 8 },
  btnWsp: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 11,
  },
  btnWspText: { color: "#15803d", fontWeight: "600", fontSize: 13 },
  btnEmail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  btnEmailText: { color: "#374151", fontWeight: "600", fontSize: 13 },
  sinContacto: { fontSize: 13, color: "#9ca3af", fontStyle: "italic" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af", textAlign: "center", paddingHorizontal: 40 },
})
