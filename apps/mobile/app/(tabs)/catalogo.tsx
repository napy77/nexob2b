import { useEffect, useState } from "react"
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Image, Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { getMayoristas, solicitarAlta, ApiError } from "../../lib/api"
import { BACKEND_URL } from "../../lib/config"

type Mayorista = {
  id: string
  nombre: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  logo_url?: string | null
  visibilidad?: string
  solicitud: { id: string; estado: string } | null
  contacto: { nombre: string; celular: string | null; email: string | null; es_vendedor: boolean }
}

export default function CatalogoTab() {
  const { token, logout } = useAuth()
  const router = useRouter()
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [solicitando, setSolicitando] = useState<string | null>(null)

  const cargar = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getMayoristas(token)
      setMayoristas(data.mayoristas || [])
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [token])

  const handleSolicitar = async (mayoristaId: string) => {
    if (!token) return
    setSolicitando(mayoristaId)
    try {
      await solicitarAlta(token, mayoristaId)
      cargar()
    } catch (e: any) {
      Alert.alert("Error", e.message)
    } finally {
      setSolicitando(null)
    }
  }

  const filtrados = mayoristas.filter((m) =>
    !busqueda ||
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.rubros?.some((r) => r.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const renderItem = ({ item: m }: { item: Mayorista }) => {
    const estado = m.solicitud?.estado
    const aceptado = estado === "aceptado"

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => aceptado && router.push(`/catalogo/${m.id}`)}
        activeOpacity={aceptado ? 0.7 : 1}
      >
        <View style={styles.cardInner}>
          {/* Logo / avatar */}
          <View style={styles.logoBox}>
            {m.logo_url
              ? <Image source={{ uri: `${BACKEND_URL}${m.logo_url}` }} style={styles.logo} resizeMode="contain" />
              : <Text style={styles.logoInitial}>{m.nombre[0]}</Text>
            }
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>{m.nombre}</Text>
            {(m.ciudad || m.provincia) && (
              <Text style={styles.ubicacion}>
                {[m.ciudad, m.provincia].filter(Boolean).join(", ")}
              </Text>
            )}
            {m.rubros?.length > 0 && (
              <Text style={styles.rubros} numberOfLines={1}>
                {m.rubros.slice(0, 3).join(" · ")}
              </Text>
            )}
          </View>

          {/* Acción */}
          <View style={styles.accion}>
            {aceptado ? (
              <View style={styles.badgeOk}>
                <Text style={styles.badgeOkText}>Ver →</Text>
              </View>
            ) : estado === "pendiente" ? (
              <View style={styles.badgePend}>
                <Text style={styles.badgePendText}>Pendiente</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.btnSolicitar, solicitando === m.id && styles.btnDisabled]}
                onPress={() => handleSolicitar(m.id)}
                disabled={solicitando === m.id}
              >
                {solicitando === m.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnSolicitarText}>Solicitar</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Catálogo</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Buscar mayorista o rubro..."
          placeholderTextColor="#9ca3af"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" size="large" />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshing={loading}
          onRefresh={cargar}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyText}>No hay mayoristas disponibles</Text>
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
  searchRow: { padding: 12, backgroundColor: "#fff" },
  search: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
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
  rubros: { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  accion: { flexShrink: 0 },
  badgeOk: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeOkText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  badgePend: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgePendText: { color: "#92400e", fontWeight: "600", fontSize: 12 },
  btnSolicitar: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 80,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnSolicitarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontSize: 15 },
})
