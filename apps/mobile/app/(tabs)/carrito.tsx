import { useEffect, useState } from "react"
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, ActivityIndicator, Image, ScrollView,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { crearOrden, ApiError } from "../../lib/api"
import { BACKEND_URL, PUB_KEY } from "../../lib/config"

type MedioPago = {
  id: string
  nombre: string
  tipo: string
  icono: string | null
  descripcion: string | null
  porcentaje_costo: number
}

export default function CarritoTab() {
  const router = useRouter()
  const { token } = useAuth()
  const { items, removeItem, updateCantidad, clearCart,
    totalNeto, totalIva, total, mayorista_nombre, mayorista_id } = useCart()
  const [notas, setNotas] = useState("")
  const [confirmando, setConfirmando] = useState(false)
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([])
  const [medioPagoId, setMedioPagoId] = useState<string>("")
  const [cargandoMedios, setCargandoMedios] = useState(false)

  useEffect(() => {
    if (!mayorista_id || !token || items.length === 0) return
    setCargandoMedios(true)
    fetch(`${BACKEND_URL}/store/mayoristas/${mayorista_id}/medios-pago`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-publishable-api-key": PUB_KEY,
      },
    })
      .then(r => r.json())
      .then(d => {
        const medios = d.medios_pago || []
        setMediosPago(medios)
        if (medios.length > 0) setMedioPagoId(medios[0].id)
      })
      .catch(() => {})
      .finally(() => setCargandoMedios(false))
  }, [mayorista_id, token, items.length > 0])

  const medioSeleccionado = mediosPago.find(m => m.id === medioPagoId)
  const costoMedioPago = medioSeleccionado && medioSeleccionado.porcentaje_costo > 0
    ? Math.round(total * medioSeleccionado.porcentaje_costo) / 100
    : 0
  const totalConMedio = total + costoMedioPago

  const handleConfirmar = async () => {
    if (!token || items.length === 0) return
    setConfirmando(true)
    try {
      const data = await crearOrden(token, {
        mayorista_id: items[0].mayorista_id,
        medio_pago_id: medioPagoId || undefined,
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
        notas,
      })
      clearCart()
      Alert.alert(
        "✅ Pedido enviado",
        `Tu pedido ${data.orden?.numero || ""} fue enviado al mayorista.`,
        [{ text: "Ver pedidos", onPress: () => router.push("/(tabs)/pedidos") }]
      )
    } catch (e: any) {
      Alert.alert("Error", e instanceof ApiError ? e.message : "Error al enviar el pedido")
    } finally {
      setConfirmando(false)
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>Mi Carrito</Text>
        </View>
        <View style={styles.empty}>
          <Text style={{ fontSize: 60 }}>🛒</Text>
          <Text style={styles.emptyTitle}>El carrito está vacío</Text>
          <Text style={styles.emptyText}>Agregá productos del catálogo</Text>
          <TouchableOpacity style={styles.btnExplorar} onPress={() => router.push("/(tabs)/catalogo")}>
            <Text style={styles.btnExplorarText}>Ver catálogo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Mi Carrito</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert("Vaciar carrito", "¿Querés eliminar todos los productos?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Vaciar", style: "destructive", onPress: clearCart },
          ])
        }}>
          <Text style={styles.navClear}>Vaciar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mayoristaBanner}>
        <Text style={styles.mayoristaLabel}>Pedido a: <Text style={styles.mayoristaNombre}>{mayorista_nombre}</Text></Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.producto_id}
        contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemImgBox}>
              {item.imagen_url
                ? <Image source={{ uri: `${BACKEND_URL}${item.imagen_url}` }} style={styles.itemImg} resizeMode="cover" />
                : <Text style={{ fontSize: 28 }}>📦</Text>
              }
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.itemNombre} numberOfLines={2}>{item.nombre}</Text>
              <Text style={styles.itemPrecio}>${item.precio_unitario.toLocaleString("es-AR")} / {item.unidad}</Text>
              <View style={styles.cantRow}>
                <TouchableOpacity style={styles.cantBtn} onPress={() => updateCantidad(item.producto_id, item.cantidad - 1)}>
                  <Text style={styles.cantBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.cantVal}>{item.cantidad}</Text>
                <TouchableOpacity style={styles.cantBtn} onPress={() => updateCantidad(item.producto_id, item.cantidad + 1)}>
                  <Text style={styles.cantBtnText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.itemSubtotal}>
                  ${(item.precio_unitario * item.cantidad).toLocaleString("es-AR")}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => removeItem(item.producto_id)} style={styles.deleteBtn}>
              <Text style={{ fontSize: 18, color: "#ef4444" }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.notasLabel}>Notas (opcional)</Text>
            <TextInput
              style={styles.notasInput}
              value={notas}
              onChangeText={setNotas}
              placeholder="Indicaciones especiales, dirección de entrega..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />

            {/* Totales productos */}
            <View style={styles.totalesBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal neto</Text>
                <Text style={styles.totalVal}>${totalNeto.toLocaleString("es-AR")}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA estimado</Text>
                <Text style={styles.totalVal}>${totalIva.toLocaleString("es-AR")}</Text>
              </View>
              <View style={[styles.totalRow, styles.subtotalBorder]}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalVal}>${total.toLocaleString("es-AR")}</Text>
              </View>
            </View>

            {/* Selector medio de pago */}
            {cargandoMedios ? (
              <ActivityIndicator color="#2563eb" style={{ marginVertical: 12 }} />
            ) : mediosPago.length > 0 && (
              <View style={styles.mediosBox}>
                <Text style={styles.mediosTitulo}>Medio de pago</Text>
                {mediosPago.map(m => {
                  const costo = m.porcentaje_costo > 0
                    ? Math.round(total * m.porcentaje_costo) / 100
                    : 0
                  const selected = medioPagoId === m.id
                  return (
                    <TouchableOpacity key={m.id} style={[styles.medioRow, selected && styles.medioSelected]}
                      onPress={() => setMedioPagoId(m.id)}>
                      <View style={styles.medioLeft}>
                        <Text style={{ fontSize: 22 }}>{m.icono || "💳"}</Text>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={[styles.medioNombre, selected && { color: "#1d4ed8" }]}>{m.nombre}</Text>
                          {m.descripcion ? <Text style={styles.medioDesc}>{m.descripcion}</Text> : null}
                        </View>
                      </View>
                      <Text style={m.porcentaje_costo > 0 ? styles.medioCosto : styles.medioSinCosto}>
                        {m.porcentaje_costo > 0 ? `+${m.porcentaje_costo}%` : "Sin costo"}
                      </Text>
                    </TouchableOpacity>
                  )
                })}

                {/* Costo del método */}
                {costoMedioPago > 0 && (
                  <View style={styles.costoRow}>
                    <Text style={styles.costoLabel}>Costo {medioSeleccionado?.nombre}</Text>
                    <Text style={styles.costoVal}>+${costoMedioPago.toLocaleString("es-AR")}</Text>
                  </View>
                )}

                {/* Total final */}
                <View style={styles.totalFinalRow}>
                  <Text style={styles.totalFinalLabel}>Total a pagar</Text>
                  <Text style={styles.totalFinalVal}>${totalConMedio.toLocaleString("es-AR")}</Text>
                </View>
              </View>
            )}

            {/* Si no hay medios, solo total */}
            {mediosPago.length === 0 && !cargandoMedios && (
              <View style={[styles.totalRow, { marginBottom: 16 }]}>
                <Text style={[styles.totalLabel, { fontWeight: "800", fontSize: 16 }]}>Total</Text>
                <Text style={[styles.totalVal, { fontSize: 20, color: "#2563eb" }]}>${total.toLocaleString("es-AR")}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btnConfirmar, confirmando && styles.btnDisabled]}
              onPress={handleConfirmar}
              disabled={confirmando}
            >
              {confirmando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnConfirmarText}>Confirmar pedido</Text>
              }
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  navClear: { fontSize: 14, color: "#ef4444", fontWeight: "600" },
  mayoristaBanner: { backgroundColor: "#eff6ff", paddingHorizontal: 16, paddingVertical: 8 },
  mayoristaLabel: { fontSize: 13, color: "#1d4ed8" },
  mayoristaNombre: { fontWeight: "700" },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemImgBox: {
    width: 56, height: 56,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  itemImg: { width: 56, height: 56 },
  itemNombre: { fontSize: 13, fontWeight: "700", color: "#111827" },
  itemPrecio: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cantRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  cantBtn: {
    width: 28, height: 28,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cantBtnText: { fontSize: 18, fontWeight: "700", color: "#374151" },
  cantVal: { fontSize: 15, fontWeight: "700", minWidth: 22, textAlign: "center" },
  itemSubtotal: { fontSize: 13, fontWeight: "700", color: "#2563eb", marginLeft: "auto" },
  deleteBtn: { padding: 8 },
  footer: { padding: 12 },
  notasLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  notasInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  totalesBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  subtotalBorder: { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontSize: 14, color: "#6b7280" },
  totalVal: { fontSize: 14, fontWeight: "700", color: "#111827" },
  // medios de pago
  mediosBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  mediosTitulo: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  medioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
  },
  medioSelected: { borderColor: "#3b82f6", backgroundColor: "#eff6ff" },
  medioLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  medioNombre: { fontSize: 14, fontWeight: "600", color: "#111827" },
  medioDesc: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  medioCosto: { fontSize: 12, fontWeight: "700", color: "#d97706" },
  medioSinCosto: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  costoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  costoLabel: { fontSize: 13, color: "#c2410c" },
  costoVal: { fontSize: 13, fontWeight: "700", color: "#c2410c" },
  totalFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    marginTop: 4,
  },
  totalFinalLabel: { fontSize: 16, fontWeight: "800", color: "#111827" },
  totalFinalVal: { fontSize: 20, fontWeight: "800", color: "#2563eb" },
  btnConfirmar: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnConfirmarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af" },
  btnExplorar: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnExplorarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
