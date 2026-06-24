import { useEffect, useState, useCallback } from "react"
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { getOrdenes, getOrden, getDocumentosOrden, ApiError } from "../../lib/api"
import { BACKEND_URL } from "../../lib/config"

type Orden = {
  id: string
  numero: string
  estado: string
  total: number
  created_at: string
  mayorista_nombre?: string
  items: { nombre: string; cantidad: number; unidad: string }[]
}

const ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: "Pendiente",  color: "#92400e", bg: "#fef3c7" },
  confirmado: { label: "Confirmado", color: "#1e40af", bg: "#dbeafe" },
  enviado:    { label: "Enviado",    color: "#5b21b6", bg: "#ede9fe" },
  entregado:  { label: "Entregado",  color: "#065f46", bg: "#d1fae5" },
  cancelado:  { label: "Cancelado",  color: "#991b1b", bg: "#fee2e2" },
}

export default function PedidosTab() {
  const router = useRouter()
  const { token, logout } = useAuth()
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState<any | null>(null)
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)

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
    try {
      const [d, docs] = await Promise.all([
        getOrden(token, id),
        getDocumentosOrden(token, id),
      ])
      setDetalle(d.orden || d)
      setDocumentos(docs.documentos || [])
    } catch {}
    finally { setLoadingDetalle(false) }
  }

  const renderOrden = ({ item: o }: { item: Orden }) => {
    const e = ESTADO[o.estado] || { label: o.estado, color: "#374151", bg: "#f3f4f6" }
    return (
      <TouchableOpacity style={styles.card} onPress={() => abrirDetalle(o.id)}>
        <View style={styles.cardTop}>
          <Text style={styles.numero}>{o.numero}</Text>
          <View style={[styles.badge, { backgroundColor: e.bg }]}>
            <Text style={[styles.badgeText, { color: e.color }]}>{e.label}</Text>
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

  // Si hay detalle abierto, mostrar vista de detalle
  if (detalle || loadingDetalle) {
    const e = detalle ? (ESTADO[detalle.estado] || { label: detalle.estado, color: "#374151", bg: "#f3f4f6" }) : null
    const DOC_ICON: Record<string, string> = { factura: "🧾", remito: "📋", recibo: "💳", otro: "📄" }

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
          <FlatList
            data={detalle.items || []}
            keyExtractor={(_: any, i: number) => String(i)}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View>
                <View style={[styles.estadoBadge, { backgroundColor: e!.bg }]}>
                  <Text style={[styles.estadoText, { color: e!.color }]}>{e!.label}</Text>
                </View>
                {detalle.mayorista_nombre && (
                  <Text style={styles.detalleMayorista}>{detalle.mayorista_nombre}</Text>
                )}
                <Text style={styles.detalleSeccion}>Productos</Text>
              </View>
            }
            renderItem={({ item }: any) => (
              <View style={styles.detalleItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detalleItemNombre}>{item.nombre}</Text>
                  {(item.sku || item.ean) && (
                    <Text style={styles.detalleItemSku}>
                      {item.sku ? `SKU: ${item.sku}` : ""}{item.sku && item.ean ? " · " : ""}{item.ean ? `EAN: ${item.ean}` : ""}
                    </Text>
                  )}
                  <Text style={styles.detalleItemCant}>{item.cantidad} {item.unidad}</Text>
                </View>
                <Text style={styles.detalleItemTotal}>
                  ${(item.precio_unitario * item.cantidad).toLocaleString("es-AR")}
                </Text>
              </View>
            )}
            ListFooterComponent={
              <View>
                {/* Totales */}
                <View style={styles.totalesBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal neto</Text>
                    <Text style={styles.totalVal}>${(detalle.subtotal_neto ?? detalle.total).toLocaleString("es-AR")}</Text>
                  </View>
                  {detalle.total_iva != null && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>IVA</Text>
                      <Text style={styles.totalVal}>${detalle.total_iva.toLocaleString("es-AR")}</Text>
                    </View>
                  )}
                  <View style={[styles.totalRow, styles.totalBig]}>
                    <Text style={[styles.totalLabel, { fontWeight: "800", fontSize: 16 }]}>Total</Text>
                    <Text style={[styles.totalVal, { fontSize: 18, color: "#2563eb" }]}>${detalle.total.toLocaleString("es-AR")}</Text>
                  </View>
                </View>

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
                        onPress={() => Linking.openURL(`${BACKEND_URL}${doc.url}`)}
                      >
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
              </View>
            }
          />
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
  estadoBadge: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  estadoText: { fontWeight: "700", fontSize: 14 },
  detalleMayorista: { fontSize: 14, color: "#2563eb", fontWeight: "700", marginBottom: 12 },
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
  docsBox: { marginTop: 4 },
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
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af" },
})
