import { useCallback, useState } from "react"
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { useVendedor } from "../../lib/vendedor"
import { getMisComerciosVendedor, ApiError } from "../../lib/api"
import { useRouter } from "expo-router"

type Comercio = {
  id: string
  nombre: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  cuit?: string
}

export default function ClientesTab() {
  const { token, logout } = useAuth()
  const { clearCart } = useCart()
  const { comercioCliente, setComercioCliente } = useVendedor()
  const router = useRouter()
  const [comercios, setComercio] = useState<Comercio[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getMisComerciosVendedor(token)
      setComercio(data.comercios || [])
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { cargar() }, [token]))

  const handleNuevoPedido = (c: Comercio) => {
    if (comercioCliente && comercioCliente.id !== c.id) {
      Alert.alert(
        "Cambiar cliente",
        `Tenés un pedido en curso para ${comercioCliente.nombre}. ¿Descartarlo y empezar uno nuevo para ${c.nombre}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Cambiar", style: "destructive", onPress: () => {
              clearCart()
              setComercioCliente({ id: c.id, nombre: c.nombre })
              router.push("/(vendedor)/catalogo")
            }
          },
        ]
      )
    } else {
      setComercioCliente({ id: c.id, nombre: c.nombre })
      router.push("/(vendedor)/catalogo")
    }
  }

  const renderItem = ({ item: c }: { item: Comercio }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{c.nombre[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombre}>{c.nombre}</Text>
          {c.cuit && <Text style={styles.sub}>CUIT: {c.cuit}</Text>}
          {(c.ciudad || c.provincia) && (
            <Text style={styles.sub}>{[c.ciudad, c.provincia].filter(Boolean).join(", ")}</Text>
          )}
        </View>
      </View>

      <View style={styles.cardBtns}>
        {c.telefono && (
          <TouchableOpacity
            style={styles.btnWsp}
            onPress={() => Linking.openURL(`https://wa.me/${c.telefono!.replace(/\D/g, "")}`)}
          >
            <Text style={styles.btnWspText}>💬 WhatsApp</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btnPedido, comercioCliente?.id === c.id && styles.btnPedidoActive]}
          onPress={() => handleNuevoPedido(c)}
        >
          <Text style={styles.btnPedidoText}>
            {comercioCliente?.id === c.id ? "✓ Tomando pedido" : "+ Nuevo pedido"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Mis Clientes</Text>
        {comercioCliente && (
          <Text style={styles.navSub}>Pedido para: {comercioCliente.nombre}</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#059669" size="large" />
      ) : (
        <FlatList
          data={comercios}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshing={loading}
          onRefresh={cargar}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>👥</Text>
              <Text style={styles.emptyText}>Sin clientes asignados</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0fdf4" },
  nav: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  navSub: { fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#059669" },
  nombre: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cardBtns: { flexDirection: "row", gap: 8 },
  btnWsp: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  btnWspText: { color: "#059669", fontWeight: "600", fontSize: 13 },
  btnPedido: {
    flex: 2,
    backgroundColor: "#059669",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  btnPedidoActive: { backgroundColor: "#047857" },
  btnPedidoText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 15 },
})
