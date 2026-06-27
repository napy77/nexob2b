import { useEffect, useState } from "react"
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
import { BACKEND_URL, PUB_KEY } from "../../lib/config"

type MedioPago = {
  id: string
  nombre: string
  tipo: string
  icono: string | null
  descripcion: string | null
  porcentaje_costo: number
}

type Transporte = {
  id: string
  nombre: string
  tipo: string
  icono: string | null
  descripcion: string | null
  porcentaje_costo: number
}

type Paso = "carrito" | "transporte" | "pago"

export default function CarritoVendedorTab() {
  const router = useRouter()
  const { token } = useAuth()
  const { items, mayorista_id: carritoMayoristaId, updateItem, removeItem, clearCart,
    totalNeto, totalIva, total } = useCart()
  const { comercioCliente, setComercioCliente } = useVendedor()

  const [paso, setPaso] = useState<Paso>("carrito")
  const [notas, setNotas] = useState("")
  const [loading, setLoading] = useState(false)
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([])
  const [medioPagoId, setMedioPagoId] = useState<string>("")
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [transporteId, setTransporteId] = useState<string>("")
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!token || items.length === 0 || !carritoMayoristaId) return
    setCargando(true)
    const headers = { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY }

    Promise.all([
      fetch(`${BACKEND_URL}/store/mayoristas/${carritoMayoristaId}/medios-pago`, { headers })
        .then(r => r.json()).catch(() => ({ medios_pago: [] })),
      fetch(`${BACKEND_URL}/store/mayoristas/${carritoMayoristaId}/transportes`, { headers })
        .then(r => r.json()).catch(() => ({ transportes: [] })),
    ]).then(([dmp, dtr]) => {
      const medios = dmp.medios_pago || []
      const trList = dtr.transportes || []
      setMediosPago(medios)
      setTransportes(trList)
      if (medios.length > 0) setMedioPagoId(medios[0].id)
      if (trList.length > 0) setTransporteId(trList[0].id)
    }).finally(() => setCargando(false))
  }, [token, carritoMayoristaId, items.length > 0])

  const medioSeleccionado = mediosPago.find(m => m.id === medioPagoId)
  const costoMedioPago = medioSeleccionado && medioSeleccionado.porcentaje_costo > 0
    ? Math.round(total * medioSeleccionado.porcentaje_costo) / 100
    : 0

  const transporteSeleccionado = transportes.find(t => t.id === transporteId)
  const costoTransporte = transporteSeleccionado && transporteSeleccionado.porcentaje_costo > 0
    ? Math.round(total * transporteSeleccionado.porcentaje_costo) / 100
    : 0

  const totalFinal = total + costoMedioPago + costoTransporte

  const pasosVisibles: Paso[] = transportes.length > 0
    ? ["carrito", "transporte", "pago"]
    : ["carrito", "pago"]
  const pasoIdx = pasosVisibles.indexOf(paso)
  const pasoSig = pasosVisibles[pasoIdx + 1] as Paso | undefined
  const pasoAnt = pasosVisibles[pasoIdx - 1] as Paso | undefined

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
        medio_pago_id: medioPagoId || undefined,
        transporte_id: transporteId || undefined,
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
      setMedioPagoId("")
      setTransporteId("")
      setPaso("carrito")
      Alert.alert("✓ Pedido enviado", `Pedido para ${comercioCliente.nombre} registrado correctamente.`)
      router.replace("/(vendedor)/pedidos")
    } catch (e: any) {
      Alert.alert("Error", e instanceof ApiError ? e.message : e?.message || "Error al confirmar")
    } finally {
      setLoading(false)
    }
  }

  // ── Carrito vacío ────────────────────────────────────────────────────────────
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

  const tituloPaso: Record<Paso, string> = {
    carrito:    "Pedido en curso",
    transporte: "Transporte",
    pago:       "Forma de pago",
  }

  const header = (
    <View style={styles.nav}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {pasoAnt ? (
          <TouchableOpacity onPress={() => setPaso(pasoAnt)} style={{ padding: 4 }}>
            <Text style={{ fontSize: 20, color: "#6b7280" }}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <View>
          <Text style={styles.navTitle}>{tituloPaso[paso]}</Text>
          {comercioCliente && <Text style={styles.navSub}>Para: {comercioCliente.nombre}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
        {pasosVisibles.map((p, i) => (
          <View key={p} style={[
            styles.stepDot,
            i === pasoIdx ? styles.stepDotActive : i < pasoIdx ? styles.stepDotDone : {}
          ]} />
        ))}
      </View>
    </View>
  )

  // ── PASO 1: CARRITO ──────────────────────────────────────────────────────────
  if (paso === "carrito") {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        {header}
        {!comercioCliente && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⚠ No seleccionaste un cliente. Ir a Mis Clientes para asignarlo.</Text>
          </View>
        )}
        <FlatList
          data={items}
          keyExtractor={(i) => i.producto_id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNombre}>{item.nombre}</Text>
                <Text style={styles.itemPrecio}>${item.precio_unitario.toLocaleString("es-AR")} / {item.unidad}</Text>
              </View>
              <View style={styles.cantRow}>
                <TouchableOpacity style={styles.cantBtn}
                  onPress={() => item.cantidad > 1 ? updateItem(item.producto_id, item.cantidad - 1) : removeItem(item.producto_id)}>
                  <Text style={styles.cantBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.cantVal}>{item.cantidad}</Text>
                <TouchableOpacity style={styles.cantBtn}
                  onPress={() => updateItem(item.producto_id, item.cantidad + 1)}>
                  <Text style={styles.cantBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.itemSubtotal}>${(item.precio_unitario * item.cantidad).toLocaleString("es-AR")}</Text>
            </View>
          )}
          ListFooterComponent={
            <View style={{ paddingTop: 8 }}>
              <View style={styles.totalesBox}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Neto</Text>
                  <Text style={styles.totalVal}>${totalNeto.toLocaleString("es-AR")}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>IVA</Text>
                  <Text style={styles.totalVal}>${totalIva.toLocaleString("es-AR")}</Text>
                </View>
                <View style={[styles.totalRow, styles.subtotalBorder]}>
                  <Text style={[styles.totalLabel, { fontWeight: "700" }]}>Subtotal</Text>
                  <Text style={[styles.totalVal, { fontSize: 16 }]}>${total.toLocaleString("es-AR")}</Text>
                </View>
              </View>
              {cargando
                ? <ActivityIndicator color="#059669" style={{ marginVertical: 12 }} />
                : (
                  <TouchableOpacity
                    style={[styles.btnConfirmar, !comercioCliente && styles.btnDisabled]}
                    onPress={() => comercioCliente ? setPaso(pasoSig!) : Alert.alert("Sin cliente", "Seleccioná un cliente primero.")}
                  >
                    <Text style={styles.btnConfirmarText}>Continuar →</Text>
                  </TouchableOpacity>
                )
              }
            </View>
          }
        />
      </SafeAreaView>
    )
  }

  // ── PASO 2: TRANSPORTE ───────────────────────────────────────────────────────
  if (paso === "transporte") {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {transportes.map(t => {
            const costo = t.porcentaje_costo > 0
              ? Math.round(total * t.porcentaje_costo) / 100
              : 0
            const selected = transporteId === t.id
            return (
              <TouchableOpacity key={t.id}
                style={[styles.opcionRow, selected && styles.opcionSelectedGreen]}
                onPress={() => setTransporteId(t.id)}>
                <View style={styles.opcionLeft}>
                  <Text style={{ fontSize: 24 }}>{t.icono || "🚚"}</Text>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.opcionNombre, selected && { color: "#15803d" }]}>{t.nombre}</Text>
                    {t.descripcion ? <Text style={styles.opcionDesc}>{t.descripcion}</Text> : null}
                  </View>
                </View>
                <Text style={t.porcentaje_costo > 0 ? styles.opcionCosto : styles.opcionSinCosto}>
                  {t.porcentaje_costo > 0 ? `+${t.porcentaje_costo}%` : "Sin costo"}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        <View style={styles.footerFijo}>
          {costoTransporte > 0 && (
            <View style={styles.costoRow}>
              <Text style={styles.costoLabel}>Costo {transporteSeleccionado?.nombre}</Text>
              <Text style={styles.costoVal}>+${costoTransporte.toLocaleString("es-AR")}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { fontWeight: "700" }]}>Subtotal con transporte</Text>
            <Text style={[styles.totalVal, { fontSize: 15 }]}>${(total + costoTransporte).toLocaleString("es-AR")}</Text>
          </View>
          <TouchableOpacity style={styles.btnConfirmar} onPress={() => setPaso("pago")}>
            <Text style={styles.btnConfirmarText}>Continuar →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── PASO 3: FORMA DE PAGO ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {header}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {mediosPago.map(m => {
          const costo = m.porcentaje_costo > 0
            ? Math.round(total * m.porcentaje_costo) / 100
            : 0
          const selected = medioPagoId === m.id
          return (
            <TouchableOpacity key={m.id}
              style={[styles.opcionRow, selected && styles.opcionSelectedEmerald]}
              onPress={() => setMedioPagoId(m.id)}>
              <View style={styles.opcionLeft}>
                <Text style={{ fontSize: 24 }}>{m.icono || "💳"}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.opcionNombre, selected && { color: "#059669" }]}>{m.nombre}</Text>
                  {m.descripcion ? <Text style={styles.opcionDesc}>{m.descripcion}</Text> : null}
                </View>
              </View>
              <Text style={m.porcentaje_costo > 0 ? styles.opcionCosto : styles.opcionSinCosto}>
                {m.porcentaje_costo > 0 ? `+${m.porcentaje_costo}%` : "Sin costo"}
              </Text>
            </TouchableOpacity>
          )
        })}

        <TextInput
          style={styles.notasInput}
          value={notas}
          onChangeText={setNotas}
          placeholder="Notas del pedido (opcional)..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
        />
      </ScrollView>

      <View style={styles.footerFijo}>
        <View style={styles.resumenBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Productos</Text>
            <Text style={styles.totalVal}>${total.toLocaleString("es-AR")}</Text>
          </View>
          {costoTransporte > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Transporte ({transporteSeleccionado?.nombre})</Text>
              <Text style={styles.totalVal}>+${costoTransporte.toLocaleString("es-AR")}</Text>
            </View>
          )}
          {costoMedioPago > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Costo financiero ({medioSeleccionado?.nombre})</Text>
              <Text style={styles.totalVal}>+${costoMedioPago.toLocaleString("es-AR")}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.subtotalBorder]}>
            <Text style={[styles.totalLabel, { fontWeight: "800", fontSize: 15 }]}>Total a pagar</Text>
            <Text style={[styles.totalVal, { fontSize: 18, color: "#059669" }]}>${totalFinal.toLocaleString("es-AR")}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnConfirmar, loading && styles.btnDisabled]}
          onPress={handleConfirmar}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnConfirmarText}>Confirmar orden</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0fdf4" },
  nav: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  navTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  navSub: { fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e5e7eb" },
  stepDotActive: { width: 20, backgroundColor: "#059669" },
  stepDotDone: { backgroundColor: "#86efac" },
  alertBox: { backgroundColor: "#fef3c7", paddingHorizontal: 16, paddingVertical: 10 },
  alertText: { color: "#92400e", fontSize: 13 },
  itemCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8,
    gap: 10, elevation: 1,
  },
  itemNombre: { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemPrecio: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cantRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cantBtn: { width: 30, height: 30, backgroundColor: "#f3f4f6", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cantBtnText: { fontSize: 18, fontWeight: "700", color: "#059669" },
  cantVal: { fontSize: 16, fontWeight: "700", color: "#111827", minWidth: 24, textAlign: "center" },
  itemSubtotal: { fontSize: 14, fontWeight: "700", color: "#059669" },
  totalesBox: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  subtotalBorder: { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8, marginTop: 4 },
  totalLabel: { color: "#6b7280", fontSize: 14 },
  totalVal: { color: "#374151", fontSize: 14, fontWeight: "600" },
  opcionRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "#f0f0f0", borderRadius: 14,
    padding: 14, backgroundColor: "#f9fafb",
  },
  opcionSelectedGreen: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  opcionSelectedEmerald: { borderColor: "#059669", backgroundColor: "#ecfdf5" },
  opcionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  opcionNombre: { fontSize: 14, fontWeight: "700", color: "#111827" },
  opcionDesc: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  opcionCosto: { fontSize: 12, fontWeight: "700", color: "#d97706" },
  opcionSinCosto: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  costoRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#fff7ed", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  costoLabel: { fontSize: 13, color: "#c2410c" },
  costoVal: { fontSize: 13, fontWeight: "700", color: "#c2410c" },
  resumenBox: { backgroundColor: "#f0fdf4", borderRadius: 12, padding: 14 },
  notasInput: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 12, padding: 12, fontSize: 14, color: "#111827",
    minHeight: 70, textAlignVertical: "top",
  },
  footerFijo: {
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f0f0f0",
    padding: 16, gap: 8,
  },
  btnConfirmar: { backgroundColor: "#059669", borderRadius: 14, padding: 16, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnConfirmarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af" },
})
