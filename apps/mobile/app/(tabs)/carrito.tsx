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

type Transporte = {
  id: string
  nombre: string
  tipo: string
  icono: string | null
  descripcion: string | null
  porcentaje_costo: number
}

type Paso = "carrito" | "transporte" | "pago"

export default function CarritoTab() {
  const router = useRouter()
  const { token } = useAuth()
  const { items, removeItem, updateCantidad, clearCart,
    totalNeto, totalIva, total, mayorista_nombre, mayorista_id } = useCart()

  const [paso, setPaso] = useState<Paso>("carrito")
  const [notas, setNotas] = useState("")
  const [confirmando, setConfirmando] = useState(false)
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([])
  const [medioPagoId, setMedioPagoId] = useState<string>("")
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [transporteId, setTransporteId] = useState<string>("")
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!mayorista_id || !token || items.length === 0) return
    setCargando(true)
    const headers = { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY }

    Promise.all([
      fetch(`${BACKEND_URL}/store/mayoristas/${mayorista_id}/medios-pago`, { headers })
        .then(r => r.json()).catch(() => ({ medios_pago: [] })),
      fetch(`${BACKEND_URL}/store/mayoristas/${mayorista_id}/transportes`, { headers })
        .then(r => r.json()).catch(() => ({ transportes: [] })),
    ]).then(([dmp, dtr]) => {
      const medios = dmp.medios_pago || []
      const trList = dtr.transportes || []
      setMediosPago(medios)
      setTransportes(trList)
      if (medios.length > 0) setMedioPagoId(medios[0].id)
      if (trList.length > 0) setTransporteId(trList[0].id)
    }).finally(() => setCargando(false))
  }, [mayorista_id, token, items.length > 0])

  const medioSeleccionado = mediosPago.find(m => m.id === medioPagoId)
  const costoMedioPago = medioSeleccionado && medioSeleccionado.porcentaje_costo > 0
    ? Math.round(total * medioSeleccionado.porcentaje_costo) / 100
    : 0

  const transporteSeleccionado = transportes.find(t => t.id === transporteId)
  const costoTransporte = transporteSeleccionado && transporteSeleccionado.porcentaje_costo > 0
    ? Math.round(total * transporteSeleccionado.porcentaje_costo) / 100
    : 0

  const totalFinal = total + costoMedioPago + costoTransporte

  // Pasos disponibles (omitir transporte si el mayorista no tiene)
  const pasosVisibles: Paso[] = transportes.length > 0
    ? ["carrito", "transporte", "pago"]
    : ["carrito", "pago"]
  const pasoIdx = pasosVisibles.indexOf(paso)
  const pasoSig = pasosVisibles[pasoIdx + 1] as Paso | undefined
  const pasoAnt = pasosVisibles[pasoIdx - 1] as Paso | undefined

  const handleConfirmar = async () => {
    if (!token || items.length === 0) return
    setConfirmando(true)
    try {
      const data = await crearOrden(token, {
        mayorista_id: items[0].mayorista_id,
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
        notas,
      })
      clearCart()
      setPaso("carrito")
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

  // ── Carrito vacío ────────────────────────────────────────────────────────────
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

  // ── Header compartido ────────────────────────────────────────────────────────
  const tituloPaso: Record<Paso, string> = {
    carrito:    "Mi Carrito",
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
          <Text style={styles.navSub}>{mayorista_nombre}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* Indicador de pasos */}
        <View style={{ flexDirection: "row", gap: 4 }}>
          {pasosVisibles.map((p, i) => (
            <View key={p} style={[
              styles.stepDot,
              i === pasoIdx ? styles.stepDotActive : i < pasoIdx ? styles.stepDotDone : {}
            ]} />
          ))}
        </View>
        {paso === "carrito" && (
          <TouchableOpacity onPress={() => {
            Alert.alert("Vaciar carrito", "¿Eliminás todos los productos?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Vaciar", style: "destructive", onPress: clearCart },
            ])
          }}>
            <Text style={styles.navClear}>Vaciar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  // ── PASO 1: CARRITO ──────────────────────────────────────────────────────────
  if (paso === "carrito") {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        {header}
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
            <View style={{ paddingTop: 8 }}>
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
                  <Text style={[styles.totalLabel, { fontWeight: "700" }]}>Subtotal</Text>
                  <Text style={[styles.totalVal, { fontSize: 16 }]}>${total.toLocaleString("es-AR")}</Text>
                </View>
              </View>
              {cargando
                ? <ActivityIndicator color="#2563eb" style={{ marginVertical: 12 }} />
                : (
                  <TouchableOpacity style={styles.btnConfirmar} onPress={() => setPaso(pasoSig!)}>
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
          {transportes.length === 0 ? (
            <Text style={{ color: "#9ca3af", textAlign: "center", marginTop: 40 }}>
              El mayorista no configuró opciones de transporte.
            </Text>
          ) : transportes.map(t => {
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
        {mediosPago.length === 0 ? (
          <Text style={{ color: "#9ca3af", textAlign: "center", marginTop: 40 }}>
            El mayorista no configuró medios de pago.
          </Text>
        ) : mediosPago.map(m => {
          const costo = m.porcentaje_costo > 0
            ? Math.round(total * m.porcentaje_costo) / 100
            : 0
          const selected = medioPagoId === m.id
          return (
            <TouchableOpacity key={m.id}
              style={[styles.opcionRow, selected && styles.opcionSelectedBlue]}
              onPress={() => setMedioPagoId(m.id)}>
              <View style={styles.opcionLeft}>
                <Text style={{ fontSize: 24 }}>{m.icono || "💳"}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.opcionNombre, selected && { color: "#1d4ed8" }]}>{m.nombre}</Text>
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
          placeholder="Notas para el mayorista (opcional)..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
        />
      </ScrollView>

      <View style={styles.footerFijo}>
        {/* Resumen */}
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
            <Text style={[styles.totalVal, { fontSize: 18, color: "#2563eb" }]}>${totalFinal.toLocaleString("es-AR")}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnConfirmar, confirmando && styles.btnDisabled]}
          onPress={handleConfirmar}
          disabled={confirmando}
        >
          {confirmando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnConfirmarText}>Confirmar orden</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  navTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  navSub: { fontSize: 12, color: "#2563eb", fontWeight: "600" },
  navClear: { fontSize: 14, color: "#ef4444", fontWeight: "600" },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  stepDotActive: { width: 20, backgroundColor: "#2563eb" },
  stepDotDone: { backgroundColor: "#93c5fd" },
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
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  itemImgBox: {
    width: 56, height: 56, borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", flexShrink: 0,
  },
  itemImg: { width: 56, height: 56 },
  itemNombre: { fontSize: 13, fontWeight: "700", color: "#111827" },
  itemPrecio: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cantRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  cantBtn: {
    width: 28, height: 28, backgroundColor: "#f0f0f0",
    borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  cantBtnText: { fontSize: 18, fontWeight: "700", color: "#374151" },
  cantVal: { fontSize: 15, fontWeight: "700", minWidth: 22, textAlign: "center" },
  itemSubtotal: { fontSize: 13, fontWeight: "700", color: "#2563eb", marginLeft: "auto" },
  deleteBtn: { padding: 8 },
  totalesBox: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  subtotalBorder: { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontSize: 14, color: "#6b7280" },
  totalVal: { fontSize: 14, fontWeight: "700", color: "#111827" },
  // opciones (transporte / pago)
  opcionRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "#f0f0f0", borderRadius: 14,
    padding: 14, backgroundColor: "#f9fafb",
  },
  opcionSelectedBlue: { borderColor: "#3b82f6", backgroundColor: "#eff6ff" },
  opcionSelectedGreen: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  opcionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  opcionNombre: { fontSize: 14, fontWeight: "700", color: "#111827" },
  opcionDesc: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  opcionCosto: { fontSize: 12, fontWeight: "700", color: "#d97706" },
  opcionSinCosto: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  costoRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#fff7ed", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
  },
  costoLabel: { fontSize: 13, color: "#c2410c" },
  costoVal: { fontSize: 13, fontWeight: "700", color: "#c2410c" },
  resumenBox: {
    backgroundColor: "#f9fafb", borderRadius: 12,
    padding: 14, marginBottom: 12,
  },
  notasInput: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 12, padding: 12, fontSize: 14, color: "#111827",
    minHeight: 72, textAlignVertical: "top",
  },
  footerFijo: {
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f0f0f0",
    padding: 16, gap: 8,
  },
  btnConfirmar: {
    backgroundColor: "#2563eb", borderRadius: 14, padding: 16, alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnConfirmarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af" },
  btnExplorar: {
    marginTop: 10, backgroundColor: "#2563eb",
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  btnExplorarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
