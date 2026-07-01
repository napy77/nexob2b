import { useEffect, useState, useCallback } from "react"
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking, TextInput, Modal, ScrollView,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { getOrdenes, getOrden, getDocumentosOrden, ApiError } from "../../lib/api"
import { BACKEND_URL } from "../../lib/config"

const PUB_KEY = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type OrdenItem = {
  id: string
  producto_id: string
  nombre: string
  sku?: string | null
  ean?: string | null
  cantidad: number
  unidad: string
  precio_unitario: number
  alicuota_iva: number
  subtotal_neto: number
  subtotal_iva: number
  subtotal: number
}

type Orden = {
  id: string
  numero: string
  estado: string
  total: number
  total_neto: number
  total_iva: number
  created_at: string
  mayorista_id: string
  mayorista_nombre?: string
  notas?: string
  mensaje_mayorista?: string | null
  medio_pago_nombre?: string | null
  porcentaje_costo_mp?: number
  costo_medio_pago?: number
  transporte_nombre?: string | null
  porcentaje_costo_transporte?: number
  costo_transporte?: number
  items: OrdenItem[]
  // Mercado Pago
  mp_preference_id?: string | null
  mp_pago_id?: string | null
  mp_estado_pago?: string | null
  // Flags de trazabilidad
  is_pagada?: boolean
  is_facturada?: boolean
  cantidad_bultos?: number | null
  peso_kg?: number | null
  dimensiones?: string | null
  numero_guia?: string | null
}

const ESTADO: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  cargada:       { label: "Cargada",    color: "#92400e", bg: "#fef3c7", emoji: "📥" },
  confirmado:    { label: "Confirmado", color: "#1e40af", bg: "#dbeafe", emoji: "✅" },
  armando:       { label: "Armando",    color: "#6d28d9", bg: "#ede9fe", emoji: "📦" },
  listo:         { label: "Listo",      color: "#065f46", bg: "#d1fae5", emoji: "🟢" },
  en_transporte: { label: "En camino",  color: "#1e3a8a", bg: "#dbeafe", emoji: "🚚" },
  entregado:     { label: "Entregado",  color: "#064e3b", bg: "#d1fae5", emoji: "✔️" },
  cancelado:     { label: "Cancelado",  color: "#991b1b", bg: "#fee2e2", emoji: "✖️" },
  devuelto:      { label: "Devuelta",   color: "#9a3412", bg: "#ffedd5", emoji: "↩️" },
  // legacy compat
  pendiente:     { label: "Cargada",    color: "#92400e", bg: "#fef3c7", emoji: "📥" },
  enviado:       { label: "En camino",  color: "#1e3a8a", bg: "#dbeafe", emoji: "🚚" },
}

export default function PedidosTab() {
  const { token, logout } = useAuth()
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState<Orden | null>(null)
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [accionando, setAccionando] = useState(false)
  const [pagarLoading, setPagarLoading] = useState(false)

  // Cantidades editables para modo devuelto
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  const cargar = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getOrdenes(token)
      const sorted = (data.ordenes || []).sort(
        (a: Orden, b: Orden) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setOrdenes(sorted)
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { cargar() }, [token]))

  const abrirDetalle = async (id: string) => {
    if (!token) return
    setLoadingDetalle(true)
    setDetalle(null)
    setDocumentos([])
    setCantidades({})
    try {
      const d = await getOrden(token, id)
      const orden = d.orden || d
      setDetalle(orden)
      // Inicializar cantidades editables
      const cants: Record<string, number> = {}
      for (const item of orden.items || []) {
        cants[item.id] = item.cantidad
      }
      setCantidades(cants)
      try {
        const docs = await getDocumentosOrden(token, id)
        setDocumentos(docs.documentos || [])
      } catch { setDocumentos([]) }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo cargar la orden")
    } finally {
      setLoadingDetalle(false) }
  }

  const cancelarPedido = async () => {
    if (!detalle || !token) return
    Alert.alert("Cancelar pedido", "¿Seguro que querés cancelar este pedido?", [
      { text: "No", style: "cancel" },
      {
        text: "Sí, cancelar", style: "destructive",
        onPress: async () => {
          setAccionando(true)
          try {
            const res = await fetch(`${BACKEND_URL}/store/ordenes/${detalle.id}/cancelar`, {
              method: "PUT",
              headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            await abrirDetalle(detalle.id)
            await cargar()
          } catch (e: any) {
            Alert.alert("Error", e.message)
          } finally { setAccionando(false) }
        },
      },
    ])
  }

  const pagarConMP = async () => {
    if (!detalle || !token) return
    setPagarLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${detalle.id}/pagar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Abre el browser del dispositivo con la URL de MP
      await Linking.openURL(data.url_pago)
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo iniciar el pago")
    } finally {
      setPagarLoading(false)
    }
  }

  const reenviarPedido = async () => {
    if (!detalle || !token) return
    const items = (detalle.items || [])
      .filter((item) => (cantidades[item.id] ?? item.cantidad) > 0)
      .map((item) => ({
        producto_id: item.producto_id,
        nombre: item.nombre,
        sku: item.sku,
        ean: item.ean,
        precio_unitario: item.precio_unitario,
        alicuota_iva: item.alicuota_iva,
        cantidad: cantidades[item.id] ?? item.cantidad,
        unidad: item.unidad,
      }))

    if (items.length === 0) {
      Alert.alert("Error", "Debe quedar al menos un producto con cantidad mayor a cero.")
      return
    }

    setAccionando(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${detalle.id}/reenviar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      Alert.alert("✅ Pedido reenviado", "El mayorista recibirá tu pedido modificado.")
      await abrirDetalle(detalle.id)
      await cargar()
    } catch (e: any) {
      Alert.alert("Error", e.message)
    } finally { setAccionando(false) }
  }

  const renderOrden = ({ item: o }: { item: Orden }) => {
    const ek = o.estado === "pendiente" ? "cargada" : o.estado === "enviado" ? "en_transporte" : o.estado
    const e = ESTADO[ek] || { label: ek, color: "#374151", bg: "#f3f4f6", emoji: "📋" }
    return (
      <TouchableOpacity style={styles.card} onPress={() => abrirDetalle(o.id)}>
        <View style={styles.cardTop}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <Text style={styles.numero}>{o.numero}</Text>
            {o.is_facturada && <Text style={{ fontSize: 14 }}>🧾</Text>}
            {o.is_pagada && <Text style={{ fontSize: 14 }}>💰</Text>}
          </View>
          <View style={[styles.badge, { backgroundColor: e.bg }]}>
            <Text style={[styles.badgeText, { color: e.color }]}>{e.emoji} {e.label}</Text>
          </View>
        </View>
        {o.mayorista_nombre && (
          <Text style={styles.mayorista}>{o.mayorista_nombre}</Text>
        )}
        <Text style={styles.items} numberOfLines={1}>
          {o.items?.slice(0, 2).map((i) => `${i.cantidad} ${i.nombre}`).join(" · ")}
          {(o.items?.length || 0) > 2 && ` +${o.items.length - 2}`}
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.total}>${o.total.toLocaleString("es-AR")}</Text>
          <Text style={styles.fecha}>
            {new Date(o.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" })}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  // Vista de detalle
  if (detalle || loadingDetalle) {
    const estadoKey = detalle ? (detalle.estado === "pendiente" ? "cargada" : detalle.estado === "enviado" ? "en_transporte" : detalle.estado) : ""
    const e = detalle ? (ESTADO[estadoKey] || { label: estadoKey, color: "#374151", bg: "#f3f4f6", emoji: "📋" }) : null
    const DOC_ICON: Record<string, string> = { factura: "🧾", remito: "📋", recibo: "💳", comprobante_pago: "💸", otro: "📄" }
    const esDevuelto = detalle?.estado === "devuelto"

    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => setDetalle(null)} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>{detalle?.numero || "Detalle"}</Text>
          <View style={{ width: 36 }} />
        </View>

        {loadingDetalle ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" size="large" />
        ) : detalle && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Estado + flags */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              <View style={[styles.estadoBadge, { backgroundColor: e!.bg, marginBottom: 0 }]}>
                <Text style={[styles.estadoText, { color: e!.color }]}>{e!.emoji} {e!.label}</Text>
              </View>
              {detalle.is_facturada && (
                <View style={{ backgroundColor: "#eef2ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: "#4338ca", fontSize: 12, fontWeight: "700" }}>🧾 Facturada</Text>
                </View>
              )}
              {detalle.is_pagada && (
                <View style={{ backgroundColor: "#f0fdf4", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: "#15803d", fontSize: 12, fontWeight: "700" }}>💰 Pagada</Text>
                </View>
              )}
            </View>

            {detalle.mayorista_nombre && (
              <Text style={styles.detalleMayorista}>{detalle.mayorista_nombre}</Text>
            )}

            {/* Info de bultos */}
            {(estadoKey === "listo" || estadoKey === "en_transporte") && detalle.cantidad_bultos && (
              <View style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#166534", marginBottom: 2 }}>
                  📦 {detalle.cantidad_bultos} bulto{detalle.cantidad_bultos !== 1 ? "s" : ""}
                  {detalle.peso_kg ? `  ·  ${detalle.peso_kg} kg` : ""}
                </Text>
                {detalle.dimensiones && <Text style={{ fontSize: 12, color: "#15803d" }}>{detalle.dimensiones}</Text>}
              </View>
            )}

            {/* Número de guía */}
            {estadoKey === "en_transporte" && detalle.numero_guia && (
              <View style={{ backgroundColor: "#eff6ff", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: "#1e40af", fontWeight: "700", marginBottom: 2 }}>🚚 Guía / seguimiento</Text>
                <Text style={{ fontSize: 14, fontFamily: "monospace", fontWeight: "700", color: "#1e3a8a" }}>{detalle.numero_guia}</Text>
              </View>
            )}

            {/* Banner devuelto */}
            {esDevuelto && detalle.mensaje_mayorista && (
              <View style={styles.devueltoBanner}>
                <Text style={styles.devueltoTitle}>↩️ El mayorista devolvió tu pedido</Text>
                <Text style={styles.devueltoMsg}>"{detalle.mensaje_mayorista}"</Text>
                <Text style={styles.devueltoHint}>
                  Modificá las cantidades y reenviá, o cancelá el pedido.
                </Text>
              </View>
            )}

            {/* Productos */}
            <Text style={styles.detalleSeccion}>
              Productos{esDevuelto ? "  (modificá cantidades)" : ""}
            </Text>

            {(detalle.items || []).map((item) => (
              <View key={item.id} style={styles.detalleItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detalleItemNombre}>{item.nombre}</Text>
                  {(item.sku || item.ean) && (
                    <Text style={styles.detalleItemSku}>
                      {item.sku ? `SKU: ${item.sku}` : ""}{item.sku && item.ean ? " · " : ""}{item.ean ? `EAN: ${item.ean}` : ""}
                    </Text>
                  )}
                  {esDevuelto ? (
                    <View style={styles.cantRow}>
                      <TouchableOpacity
                        style={styles.cantBtn}
                        onPress={() => setCantidades((c) => ({ ...c, [item.id]: Math.max(0, (c[item.id] ?? item.cantidad) - 1) }))}>
                        <Text style={styles.cantBtnText}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.cantInput}
                        keyboardType="number-pad"
                        value={String(cantidades[item.id] ?? item.cantidad)}
                        onChangeText={(v) => setCantidades((c) => ({ ...c, [item.id]: Math.max(0, Number(v) || 0) }))}
                      />
                      <TouchableOpacity
                        style={styles.cantBtn}
                        onPress={() => setCantidades((c) => ({ ...c, [item.id]: (c[item.id] ?? item.cantidad) + 1 }))}>
                        <Text style={styles.cantBtnText}>+</Text>
                      </TouchableOpacity>
                      <Text style={styles.cantUnidad}>{item.unidad}</Text>
                      {(cantidades[item.id] ?? item.cantidad) === 0 && (
                        <Text style={styles.cantCero}>se eliminará</Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.detalleItemCant}>{item.cantidad} {item.unidad}</Text>
                  )}
                </View>
                {!esDevuelto && (
                  <Text style={styles.detalleItemTotal}>
                    ${(item.precio_unitario * item.cantidad).toLocaleString("es-AR")}
                  </Text>
                )}
              </View>
            ))}

            {/* Totales — solo si no está en devuelto */}
            {!esDevuelto && (
              <View style={styles.totalesBox}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal neto</Text>
                  <Text style={styles.totalVal}>${(detalle.total_neto ?? detalle.total).toLocaleString("es-AR")}</Text>
                </View>
                {detalle.total_iva != null && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>IVA</Text>
                    <Text style={styles.totalVal}>${detalle.total_iva.toLocaleString("es-AR")}</Text>
                  </View>
                )}
                {detalle.medio_pago_nombre ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Medio de pago</Text>
                    <Text style={[styles.totalVal, { fontWeight: "600" }]}>{detalle.medio_pago_nombre}</Text>
                  </View>
                ) : null}
                {Number(detalle.costo_medio_pago) > 0 ? (
                  <View style={[styles.totalRow, { backgroundColor: "#fff7ed", borderRadius: 8, paddingHorizontal: 8 }]}>
                    <Text style={[styles.totalLabel, { color: "#c2410c" }]}>Costo método ({detalle.porcentaje_costo_mp}%)</Text>
                    <Text style={[styles.totalVal, { color: "#c2410c", fontWeight: "700" }]}>
                      +${Number(detalle.costo_medio_pago).toLocaleString("es-AR")}
                    </Text>
                  </View>
                ) : null}
                {detalle.transporte_nombre ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Transporte</Text>
                    <Text style={[styles.totalVal, { fontWeight: "600" }]}>{detalle.transporte_nombre}</Text>
                  </View>
                ) : null}
                {Number(detalle.costo_transporte) > 0 ? (
                  <View style={[styles.totalRow, { backgroundColor: "#fff7ed", borderRadius: 8, paddingHorizontal: 8 }]}>
                    <Text style={[styles.totalLabel, { color: "#c2410c" }]}>Costo transporte ({detalle.porcentaje_costo_transporte}%)</Text>
                    <Text style={[styles.totalVal, { color: "#c2410c", fontWeight: "700" }]}>
                      +${Number(detalle.costo_transporte).toLocaleString("es-AR")}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.totalRow, styles.totalBig]}>
                  <Text style={[styles.totalLabel, { fontWeight: "800", fontSize: 16 }]}>Total</Text>
                  <Text style={[styles.totalVal, { fontSize: 18, color: "#2563eb" }]}>${detalle.total.toLocaleString("es-AR")}</Text>
                </View>
              </View>
            )}

            {/* Notas */}
            {detalle.notas && (
              <View style={styles.notasBox}>
                <Text style={styles.notasLabel}>📝 Notas</Text>
                <Text style={styles.notasText}>{detalle.notas}</Text>
              </View>
            )}

            {/* Documentos */}
            {documentos.length > 0 && (
              <View style={styles.docsBox}>
                <Text style={styles.detalleSeccion}>Documentos adjuntos</Text>
                {documentos.map((doc: any) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.docItem}
                    onPress={() => Linking.openURL(`${BACKEND_URL}${doc.url}`)}>
                    <Text style={styles.docIcon}>{DOC_ICON[doc.tipo] || "📄"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docNombre}>{doc.nombre}</Text>
                      <Text style={styles.docTipo}>{doc.tipo}</Text>
                    </View>
                    <Text style={styles.docVer}>Ver ↗</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Estado de pago MP */}
            {detalle.mp_estado_pago && (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: detalle.mp_estado_pago === "aprobado" ? "#f0fdf4" :
                  detalle.mp_estado_pago === "rechazado" ? "#fef2f2" : "#fefce8",
                borderRadius: 12, padding: 12, marginBottom: 12,
                borderWidth: 1,
                borderColor: detalle.mp_estado_pago === "aprobado" ? "#86efac" :
                  detalle.mp_estado_pago === "rechazado" ? "#fca5a5" : "#fde68a",
              }}>
                <Text style={{ fontSize: 18 }}>
                  {detalle.mp_estado_pago === "aprobado" ? "✅" :
                   detalle.mp_estado_pago === "rechazado" ? "❌" :
                   detalle.mp_estado_pago === "en_proceso" ? "🔄" : "⏳"}
                </Text>
                <Text style={{
                  fontSize: 13, fontWeight: "700",
                  color: detalle.mp_estado_pago === "aprobado" ? "#15803d" :
                    detalle.mp_estado_pago === "rechazado" ? "#b91c1c" : "#92400e",
                }}>
                  Pago MP: {{
                    aprobado: "Aprobado",
                    rechazado: "Rechazado",
                    en_proceso: "En proceso",
                    cancelado: "Cancelado",
                    pendiente: "Pendiente",
                  }[detalle.mp_estado_pago] || detalle.mp_estado_pago}
                </Text>
              </View>
            )}

            {/* Acciones */}
            {esDevuelto && (
              <View style={{ gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: "#ea580c" }]}
                  onPress={reenviarPedido}
                  disabled={accionando}>
                  <Text style={styles.btnPrimaryText}>
                    {accionando ? "Enviando..." : "↩️ Reenviar pedido modificado"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnDanger}
                  onPress={cancelarPedido}
                  disabled={accionando}>
                  <Text style={styles.btnDangerText}>✖ Cancelar pedido</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Confirmar recepción: en camino O listo para retiro */}
            {["en_transporte", "enviado", "listo"].includes(detalle.estado) && (
              <View style={{ marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: "#16a34a" }]}
                  onPress={async () => {
                    Alert.alert("Confirmar entrega", "¿Ya recibiste este pedido?", [
                      { text: "No", style: "cancel" },
                      { text: "Sí, recibido", onPress: async () => {
                        setAccionando(true)
                        try {
                          const res = await fetch(`${BACKEND_URL}/store/ordenes/${detalle.id}/entregar`, {
                            method: "PUT",
                            headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error)
                          await abrirDetalle(detalle.id)
                          await cargar()
                        } catch (e: any) {
                          Alert.alert("Error", e.message)
                        } finally { setAccionando(false) }
                      }}
                    ])
                  }}
                  disabled={accionando}>
                  <Text style={styles.btnPrimaryText}>✅ Confirmar recepción</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pagar con MP + cancelar */}
            {["cargada", "pendiente", "confirmado", "armando", "listo"].includes(detalle.estado) && (
              <View style={{ gap: 10, marginTop: 8 }}>
                {detalle.mp_estado_pago !== "aprobado" && (
                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: "#009ee3" }]}
                    onPress={pagarConMP}
                    disabled={pagarLoading}>
                    <Text style={styles.btnPrimaryText}>
                      {pagarLoading ? "Abriendo Mercado Pago..." : "💳 Pagar con Mercado Pago"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {["cargada", "pendiente", "devuelto"].includes(detalle.estado) && (
              <TouchableOpacity
                style={[styles.btnDanger, { marginTop: 8 }]}
                onPress={cancelarPedido}
                disabled={accionando}>
                <Text style={styles.btnDangerText}>
                  {accionando ? "Procesando..." : "Cancelar pedido"}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Mis Pedidos</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" size="large" />
      ) : (
        <FlatList
          data={ordenes}
          keyExtractor={(o) => o.id}
          renderItem={renderOrden}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshing={loading}
          onRefresh={cargar}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>📭</Text>
              <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
              <Text style={styles.emptyText}>Tus órdenes aparecerán acá</Text>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  navTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#111827" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 28, color: "#2563eb", fontWeight: "300" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  numero: { fontSize: 15, fontWeight: "800", color: "#111827" },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  mayorista: { fontSize: 13, color: "#2563eb", fontWeight: "600", marginBottom: 4 },
  items: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  total: { fontSize: 15, fontWeight: "800", color: "#111827" },
  fecha: { fontSize: 12, color: "#9ca3af" },
  // Detalle
  estadoBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  estadoText: { fontWeight: "700", fontSize: 14 },
  detalleMayorista: { fontSize: 14, color: "#2563eb", fontWeight: "700", marginBottom: 12 },
  // Banner devuelto
  devueltoBanner: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  devueltoTitle: { fontSize: 14, fontWeight: "800", color: "#9a3412", marginBottom: 4 },
  devueltoMsg: { fontSize: 13, color: "#7c2d12", fontStyle: "italic", marginBottom: 6 },
  devueltoHint: { fontSize: 12, color: "#c2410c" },
  detalleSeccion: { fontSize: 12, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  detalleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  detalleItemNombre: { fontSize: 14, fontWeight: "700", color: "#111827" },
  detalleItemSku: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  detalleItemCant: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  detalleItemTotal: { fontSize: 15, fontWeight: "800", color: "#111827", flexShrink: 0 },
  // Cantidades editables
  cantRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  cantBtn: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1, borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  cantBtnText: { fontSize: 18, fontWeight: "600", color: "#374151", lineHeight: 22 },
  cantInput: {
    width: 44, height: 30, borderRadius: 8,
    borderWidth: 1, borderColor: "#fdba74",
    textAlign: "center", fontSize: 14, fontWeight: "700",
    color: "#111827", backgroundColor: "#fff",
  },
  cantUnidad: { fontSize: 12, color: "#6b7280" },
  cantCero: { fontSize: 11, color: "#dc2626", fontStyle: "italic" },
  totalesBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalBig: { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontSize: 14, color: "#6b7280" },
  totalVal: { fontSize: 14, fontWeight: "700", color: "#111827" },
  notasBox: { backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, marginBottom: 12 },
  notasLabel: { fontSize: 13, fontWeight: "700", color: "#92400e", marginBottom: 4 },
  notasText: { fontSize: 13, color: "#78350f" },
  docsBox: { marginTop: 4, marginBottom: 12 },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  docIcon: { fontSize: 24 },
  docNombre: { fontSize: 14, fontWeight: "600", color: "#111827" },
  docTipo: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  docVer: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  btnPrimary: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnDanger: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  btnDangerText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af" },
})
