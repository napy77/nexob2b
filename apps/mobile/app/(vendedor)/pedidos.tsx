import { useCallback, useState } from "react"
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { getOrdenesVendedor, ApiError } from "../../lib/api"

type Orden = {
  id: string
  numero: string
  comercio_nombre: string
  estado: string
  total: number
  total_neto: number
  total_iva: number
  medio_pago_nombre?: string | null
  porcentaje_costo_mp?: number
  costo_medio_pago?: number
  transporte_nombre?: string | null
  porcentaje_costo_transporte?: number
  costo_transporte?: number
  notas?: string
  mensaje_mayorista?: string | null
  created_at: string
  items: { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[]
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "#92400e", confirmado: "#1d4ed8",
  enviado: "#7c3aed", entregado: "#15803d", cancelado: "#991b1b",
  devuelto: "#9a3412",
}
const ESTADO_BG: Record<string, string> = {
  pendiente: "#fef3c7", confirmado: "#eff6ff",
  enviado: "#f5f3ff", entregado: "#f0fdf4", cancelado: "#fef2f2",
  devuelto: "#ffedd5",
}

export default function PedidosVendedorTab() {
  const { token, logout } = useAuth()
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [expandida, setExpandida] = useState<string | null>(null)

  const cargar = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getOrdenesVendedor(token)
      setOrdenes(data.ordenes || [])
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { cargar() }, [token]))

  const renderItem = ({ item: o }: { item: Orden }) => {
    const abierta = expandida === o.id
    return (
      <TouchableOpacity style={styles.card} onPress={() => setExpandida(abierta ? null : o.id)} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.numero}>{o.numero}</Text>
            <Text style={styles.cliente}>{o.comercio_nombre}</Text>
            <Text style={styles.fecha}>{new Date(o.created_at).toLocaleDateString("es-AR")}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View style={[styles.badge, { backgroundColor: ESTADO_BG[o.estado] || "#f9fafb" }]}>
              <Text style={[styles.badgeText, { color: ESTADO_COLOR[o.estado] || "#374151" }]}>
                {o.estado.charAt(0).toUpperCase() + o.estado.slice(1)}
              </Text>
            </View>
            <Text style={styles.total}>${o.total.toLocaleString("es-AR")}</Text>
          </View>
        </View>

        {abierta && (
          <View style={styles.detalle}>
            {o.items.map((it, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemNombre} numberOfLines={1}>{it.nombre}</Text>
                <Text style={styles.itemCant}>{it.cantidad} {it.unidad}</Text>
                <Text style={styles.itemPrecio}>${(it.precio_unitario * it.cantidad).toLocaleString("es-AR")}</Text>
              </View>
            ))}
            <View style={styles.subtotales}>
              <Text style={styles.subTxt}>Neto: ${o.total_neto.toLocaleString("es-AR")}</Text>
              <Text style={styles.subTxt}>IVA: ${o.total_iva.toLocaleString("es-AR")}</Text>
            </View>
            {o.medio_pago_nombre ? (
              <View style={styles.medioRow}>
                <Text style={styles.medioLabel}>💳 {o.medio_pago_nombre}</Text>
                {Number(o.costo_medio_pago) > 0 && (
                  <Text style={styles.medioCosto}>+${Number(o.costo_medio_pago).toLocaleString("es-AR")} ({o.porcentaje_costo_mp}%)</Text>
                )}
              </View>
            ) : null}
            {o.transporte_nombre ? (
              <View style={styles.medioRow}>
                <Text style={styles.medioLabel}>🚚 {o.transporte_nombre}</Text>
                {Number(o.costo_transporte) > 0 && (
                  <Text style={styles.medioCosto}>+${Number(o.costo_transporte).toLocaleString("es-AR")} ({o.porcentaje_costo_transporte}%)</Text>
                )}
              </View>
            ) : null}
            {o.notas && <Text style={styles.notas}>📝 {o.notas}</Text>}
            {o.mensaje_mayorista && (
              <View style={styles.devueltoBanner}>
                <Text style={styles.devueltoTitle}>↩️ Pedido devuelto por el mayorista</Text>
                <Text style={styles.devueltoMsg}>"{o.mensaje_mayorista}"</Text>
                <Text style={styles.devueltoHint}>El comercio debe modificarlo y reenviarlo.</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Mis Pedidos</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#059669" size="large" />
      ) : (
        <FlatList
          data={ordenes}
          keyExtractor={(o) => o.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshing={loading}
          onRefresh={cargar}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>📋</Text>
              <Text style={styles.emptyText}>Sin pedidos aún</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0fdf4" },
  nav: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 10, padding: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  numero: { fontSize: 15, fontWeight: "800", color: "#111827" },
  cliente: { fontSize: 13, color: "#059669", fontWeight: "600", marginTop: 2 },
  fecha: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  total: { fontSize: 16, fontWeight: "800", color: "#111827" },
  detalle: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, gap: 8 },
  itemNombre: { flex: 1, fontSize: 13, color: "#374151" },
  itemCant: { fontSize: 12, color: "#6b7280", width: 60, textAlign: "right" },
  itemPrecio: { fontSize: 13, fontWeight: "700", color: "#111827", width: 80, textAlign: "right" },
  subtotales: { flexDirection: "row", gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  subTxt: { fontSize: 12, color: "#6b7280" },
  medioRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, backgroundColor: "#f0fdf4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  medioLabel: { fontSize: 12, color: "#059669", fontWeight: "600" },
  medioCosto: { fontSize: 12, color: "#d97706", fontWeight: "700" },
  notas: { fontSize: 13, color: "#6b7280", fontStyle: "italic", marginTop: 8 },
  devueltoBanner: { backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", borderRadius: 10, padding: 12, marginTop: 10 },
  devueltoTitle: { fontSize: 13, fontWeight: "800", color: "#9a3412", marginBottom: 4 },
  devueltoMsg: { fontSize: 12, color: "#7c2d12", fontStyle: "italic", marginBottom: 4 },
  devueltoHint: { fontSize: 11, color: "#c2410c" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 15 },
})
