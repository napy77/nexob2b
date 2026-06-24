import { useState } from "react"
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { useVendedor } from "../../lib/vendedor"
import { crearOrdenVendedor, ApiError } from "../../lib/api"

export default function CarritoVendedorTab() {
  const router = useRouter()
  const { token } = useAuth()
  const { items, updateItem, removeItem, clearCart, totalNeto, totalIva, total } = useCart()
  const { comercioCliente, setComercioCliente } = useVendedor()
  const [notas, setNotas] = useState("")
  const [loading, setLoading] = useState(false)

  const handleConfirmar = async () => {
    if (!token || items.length === 0) return
    if (!comercioCliente) {
      Alert.alert("Sin cliente", "Seleccioná un cliente en la pestaña Mis Clientes antes de confirmar.")
      return
    }
    setLoading(true)
    try {
      await crearOrdenVendedor(token, {
        comercio_id: comercioCliente.id,
        items: items.map((i) => ({
          producto_id: i.producto_id,
          nombre: i.nombre,
          sku: i.sku,
          ean: i.ean,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          alicuota_iva: i.alicuota_iva,
          unidad: i.unidad,
        })),
        notas: notas || undefined,
      })
      clearCart()
      setComercioCliente(null)
      setNotas("")
      Alert.alert("✓ Pedido enviado", `Pedido para ${comercioCliente.nombre} registrado correctamente.`)
      router.replace("/(vendedor)/pedidos")
    } catch (e: any) {
      Alert.alert("Error", e instanceof ApiError ? e.message : e?.message || "Error al confirmar")
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>Pedido en curso</Text>
        </View>
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Sin productos</Text>
          <Text style={styles.emptyText}>Agregá productos desde el Catálogo</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Pedido en curso</Text>
        {comercioCliente && (
          <Text style={styles.navSub}>Para: {comercioCliente.nombre}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!comercioCliente && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⚠ No seleccionaste un cliente. Ir a Mis Clientes para asignarlo.</Text>
          </View>
        )}

        {items.map((item) => (
          <View key={item.producto_id} style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemNombre}>{item.nombre}</Text>
              <Text style={styles.itemPrecio}>${item.precio_unitario.toLocaleString("es-AR")} / {item.unidad}</Text>
            </View>
            <View style={styles.cantRow}>
              <TouchableOpacity style={styles.cantBtn} onPress={() => item.cantidad > 1 ? updateItem(item.producto_id, item.cantidad - 1) : removeItem(item.producto_id)}>
                <Text style={styles.cantBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.cantVal}>{item.cantidad}</Text>
              <TouchableOpacity style={styles.cantBtn} onPress={() => updateItem(item.producto_id, item.cantidad + 1)}>
                <Text style={styles.cantBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.itemSubtotal}>${(item.precio_unitario * item.cantidad).toLocaleString("es-AR")}</Text>
          </View>
        ))}

        <View style={styles.notasBox}>
          <Text style={styles.notasLabel}>Notas del pedido</Text>
          <TextInput
            style={styles.notasInput}
            value={notas}
            onChangeText={setNotas}
            placeholder="Ej: Entregar martes por la tarde..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.totales}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Neto</Text><Text style={styles.totalVal}>${totalNeto.toLocaleString("es-AR")}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA</Text><Text style={styles.totalVal}>${totalIva.toLocaleString("es-AR")}</Text></View>
          <View style={[styles.totalRow, styles.totalFinal]}><Text style={styles.totalFinalLabel}>Total</Text><Text style={styles.totalFinalVal}>${total.toLocaleString("es-AR")}</Text></View>
        </View>

        <TouchableOpacity
          style={[styles.btnConfirmar, (loading || !comercioCliente) && styles.btnDisabled]}
          onPress={handleConfirmar}
          disabled={loading || !comercioCliente}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarText}>Confirmar pedido</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0fdf4" },
  nav: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  navSub: { fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  alertBox: { backgroundColor: "#fef3c7", borderRadius: 12, padding: 12, marginBottom: 12 },
  alertText: { color: "#92400e", fontSize: 13 },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, gap: 10, elevation: 1 },
  itemNombre: { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemPrecio: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cantRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cantBtn: { width: 30, height: 30, backgroundColor: "#f3f4f6", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cantBtnText: { fontSize: 18, fontWeight: "700", color: "#059669" },
  cantVal: { fontSize: 16, fontWeight: "700", color: "#111827", minWidth: 24, textAlign: "center" },
  itemSubtotal: { fontSize: 14, fontWeight: "700", color: "#059669" },
  notasBox: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginVertical: 12 },
  notasLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  notasInput: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, fontSize: 14, color: "#111827", minHeight: 70, textAlignVertical: "top" },
  totales: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totalLabel: { color: "#6b7280", fontSize: 14 },
  totalVal: { color: "#374151", fontSize: 14, fontWeight: "600" },
  totalFinal: { borderTopWidth: 1, borderTopColor: "#f0f0f0", marginTop: 4, paddingTop: 10 },
  totalFinalLabel: { fontSize: 16, fontWeight: "800", color: "#111827" },
  totalFinalVal: { fontSize: 16, fontWeight: "800", color: "#059669" },
  btnConfirmar: { backgroundColor: "#059669", borderRadius: 14, padding: 16, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnConfirmarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af" },
})
