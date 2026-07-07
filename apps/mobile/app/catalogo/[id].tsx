import { useEffect, useState, useCallback, useRef } from "react"
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Image, ScrollView, Modal,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { getProductos, getTaxonomia, ApiError } from "../../lib/api"

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Presentacion = {
  id: string
  presentacion_id: string
  nombre: string
  factor: number
  precio: number
  precio_lista?: number
  stock?: number
  ean_propio?: string
}

type MayoristaEnProd = {
  listing_id: string
  mayorista_id: string
  mayorista_nombre: string
  tiene_alta: boolean | null
  tiempo_entrega_dias?: number
  presentaciones: Presentacion[]
}

type Producto = {
  id: string
  ean: string
  nombre: string
  descripcion?: string
  marca?: string
  unidad_base?: string
  alicuota_iva?: number
  imagen_url?: string
  pasillo_nombre?: string
  rubro_nombre?: string
  subrubro_nombre?: string
  mayoristas: MayoristaEnProd[]
}

type Pasillo = { id: string; nombre: string }
type Rubro   = { id: string; nombre: string; pasillo_id?: string }
type Subrubro = { id: string; nombre: string; rubro_id: string }

function fmt(n: number) { return "$" + n.toLocaleString("es-AR") }

// ── Componente ────────────────────────────────────────────────────────────────

export default function CatalogoMayoristaScreen() {
  const { id, nombre: nombreParam } = useLocalSearchParams<{ id: string; nombre?: string }>()
  const router = useRouter()
  const { token, logout } = useAuth()
  const { carts, addItem, totalItems } = useCart()

  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [nombreMayorista, setNombreMayorista] = useState(nombreParam || "Catálogo")

  // Búsqueda
  const [busqueda, setBusqueda] = useState("")

  // Filtros
  const [pasillos, setPasillos] = useState<Pasillo[]>([])
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [subrubros, setSubrubros] = useState<Subrubro[]>([])
  const [pasilloId, setPasilloId] = useState<string | null>(null)
  const [rubroId, setRubroId] = useState<string | null>(null)
  const [subrubroId, setSubrubroId] = useState<string | null>(null)

  // Modal
  const [modalProd, setModalProd] = useState<Producto | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return
    getTaxonomia().then(d => {
      setPasillos(d.pasillos || [])
      setRubros(d.rubros || [])
      setSubrubros(d.subrubros || [])
    }).catch(() => {})
  }, [token])

  // ── Cargar productos ──────────────────────────────────────────────────────

  const cargarProductos = useCallback(async (targetPage = 1) => {
    if (!token || !id) return
    const append = targetPage > 1
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const params: Record<string, string> = { mayorista_id: id }
      if (busqueda.trim()) params.q = busqueda.trim()
      if (pasilloId) params.pasillo_id = pasilloId
      if (rubroId) params.rubro_id = rubroId
      if (subrubroId) params.subrubro_id = subrubroId
      params.page = String(targetPage)
      params.pageSize = "50"
      const data = await getProductos(token, params)
      const prods: Producto[] = data.productos || []
      setProductos(prev => append ? [...prev, ...prods] : prods)
      setPage(data.page || targetPage)
      setTotalPages(data.totalPages || 1)
      // Nombre del mayorista desde el primer producto si no vino en params
      if (!append && !nombreParam && prods.length > 0 && prods[0].mayoristas[0]) {
        setNombreMayorista(prods[0].mayoristas[0].mayorista_nombre)
      }
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [token, id, busqueda, pasilloId, rubroId, subrubroId])

  useEffect(() => { cargarProductos(1) }, [cargarProductos])

  const cargarMas = () => {
    if (!loading && !loadingMore && page < totalPages) cargarProductos(page + 1)
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  const rubrosDelPasillo = pasilloId
    ? rubros.filter(r => (r as any).pasillo_id === pasilloId || !(r as any).pasillo_id)
    : rubros
  const subrubrosDelRubro = rubroId ? subrubros.filter(s => s.rubro_id === rubroId) : []

  // ── Agregar al carrito ────────────────────────────────────────────────────

  const agregarPresentacion = (prod: Producto, pres: Presentacion, cant: number) => {
    const m = prod.mayoristas[0]
    if (!m) return
    addItem({
      producto_id: pres.id,
      presentacion_id: pres.id,
      nombre: `${prod.nombre} · ${pres.nombre}`,
      sku: null,
      ean: pres.ean_propio || prod.ean || null,
      precio_unitario: pres.precio,
      alicuota_iva: prod.alicuota_iva ?? 21,
      cantidad: cant,
      unidad: prod.unidad_base || "un",
      imagen_url: prod.imagen_url,
      mayorista_id: m.mayorista_id,
      mayorista_nombre: m.mayorista_nombre,
    })
  }

  // ── Card de producto ──────────────────────────────────────────────────────

  const renderProducto = ({ item: prod }: { item: Producto }) => {
    const m = prod.mayoristas[0]
    const allPres = prod.mayoristas.flatMap(mx => mx.presentaciones)
    const cheapest = allPres.reduce<Presentacion | null>(
      (min, p) => min === null || p.precio < min.precio ? p : min, null
    )
    const carritoM = m ? (carts[m.mayorista_id] || []) : []
    const inCart = carritoM.filter(c => allPres.some(p => p.id === c.producto_id))
    const totalInCart = inCart.reduce((s, i) => s + i.cantidad, 0)

    return (
      <View style={s.prodCard}>
        <TouchableOpacity
          onPress={() => {
            const caps: Record<string, number> = {}
            allPres.forEach(p => { caps[p.id] = 1 })
            setCantidades(caps)
            setModalProd(prod)
          }}
          activeOpacity={0.8}
        >
          <View style={s.prodImgBox}>
            {prod.imagen_url
              ? <Image source={{ uri: prod.imagen_url }} style={s.prodImg} resizeMode="cover" />
              : <Text style={{ fontSize: 36 }}>📦</Text>
            }
          </View>
          <View style={s.prodInfo}>
            <Text style={s.prodNombre} numberOfLines={2}>{prod.nombre}</Text>
            {prod.marca && <Text style={s.prodMarca} numberOfLines={1}>{prod.marca}</Text>}
            {cheapest != null
              ? <Text style={s.prodPrecio}>{allPres.length > 1 ? "desde " : ""}{fmt(cheapest.precio)}</Text>
              : <Text style={s.prodSinPrecio}>Consultar</Text>
            }
            {totalInCart > 0 && (
              <Text style={s.enCarrito}>✓ {totalInCart} en carrito</Text>
            )}
          </View>
        </TouchableOpacity>
        {cheapest && (
          <TouchableOpacity
            style={s.btnQuickAdd}
            onPress={() => agregarPresentacion(prod, cheapest, 1)}
          >
            <Text style={s.btnQuickAddText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  // ── Vista ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>{nombreMayorista}</Text>
        <TouchableOpacity style={s.cartBtn} onPress={() => router.push("/(tabs)/carrito")}>
          <Text style={s.cartIcon}>🛒</Text>
          {totalItems > 0 && (
            <View style={s.cartBadge}><Text style={s.cartBadgeText}>{totalItems}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={s.searchBox}>
        <TextInput
          style={s.search}
          placeholder="Buscar producto, marca o EAN..."
          placeholderTextColor="#9ca3af"
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
        />
      </View>

      {/* Chips de filtro */}
      {pasillos.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipRowContent}>
            {pasillos.map(p => (
              <TouchableOpacity key={p.id}
                onPress={() => { setPasilloId(pasilloId === p.id ? null : p.id); setRubroId(null); setSubrubroId(null) }}
                style={[s.chip, pasilloId === p.id && s.chipActive]}>
                <Text style={[s.chipText, pasilloId === p.id && s.chipTextActive]}>{p.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {rubros.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chipRow, { marginTop: 0 }]} contentContainerStyle={s.chipRowContent}>
              {rubrosDelPasillo.map(r => (
                <TouchableOpacity key={r.id}
                  onPress={() => { setRubroId(rubroId === r.id ? null : r.id); setSubrubroId(null) }}
                  style={[s.chip, s.chipBlue, rubroId === r.id && s.chipBlueActive]}>
                  <Text style={[s.chipText, s.chipTextBlue, rubroId === r.id && s.chipTextActive]}>{r.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {rubroId && subrubrosDelRubro.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chipRow, { marginTop: 0 }]} contentContainerStyle={s.chipRowContent}>
              {subrubrosDelRubro.map(sr => (
                <TouchableOpacity key={sr.id}
                  onPress={() => setSubrubroId(subrubroId === sr.id ? null : sr.id)}
                  style={[s.chip, s.chipIndigo, subrubroId === sr.id && s.chipIndigoActive]}>
                  <Text style={[s.chipText, s.chipTextIndigo, subrubroId === sr.id && s.chipTextActive]}>{sr.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {(pasilloId || rubroId || subrubroId) && (
            <View style={s.limpiarRow}>
              <TouchableOpacity onPress={() => { setPasilloId(null); setRubroId(null); setSubrubroId(null) }}>
                <Text style={s.limpiar}>✕ Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Lista */}
      {loading
        ? <ActivityIndicator style={{ marginTop: 48 }} color="#2563eb" size="large" />
        : <FlatList
            data={productos}
            keyExtractor={p => p.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: 40 }}
            refreshing={loading}
            onRefresh={() => cargarProductos(1)}
            renderItem={renderProducto}
            onEndReached={cargarMas}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#2563eb" /> : null}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 42 }}>🔍</Text>
                <Text style={s.emptyText}>Sin productos con ese filtro</Text>
              </View>
            }
          />
      }

      {/* ── MODAL DETALLE ────────────────────────────────────────────────────── */}
      <Modal
        visible={!!modalProd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalProd(null)}
      >
        {modalProd && (
          <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 48 }}>
            {modalProd.imagen_url
              ? <Image source={{ uri: modalProd.imagen_url }} style={s.modalImg} resizeMode="cover" />
              : <View style={s.modalImgPlaceholder}><Text style={{ fontSize: 60 }}>📦</Text></View>
            }

            <View style={s.modalBody}>
              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.modalNombre}>{modalProd.nombre}</Text>
                  {modalProd.marca && <Text style={s.modalMarca}>{modalProd.marca}</Text>}
                  {modalProd.pasillo_nombre && (
                    <Text style={s.modalCat}>
                      {[modalProd.pasillo_nombre, modalProd.rubro_nombre].filter(Boolean).join(" › ")}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setModalProd(null)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18, color: "#9ca3af" }}>✕</Text>
                </TouchableOpacity>
              </View>

              {modalProd.descripcion && (
                <Text style={s.modalDesc}>{modalProd.descripcion}</Text>
              )}

              {/* Presentaciones */}
              <Text style={s.presTitle}>Presentaciones:</Text>
              {modalProd.mayoristas.map(m => {
                const carritoM = carts[m.mayorista_id] || []
                return m.presentaciones.map(pres => {
                  const enCarrito = carritoM.find(c => c.producto_id === pres.id)?.cantidad || 0
                  const cant = cantidades[pres.id] ?? 1
                  return (
                    <View key={pres.id} style={s.presRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.presNombre}>{pres.nombre}</Text>
                        <Text style={s.presPrecio}>{fmt(pres.precio)}</Text>
                        {pres.stock != null && <Text style={s.presStock}>Stock: {pres.stock}</Text>}
                      </View>
                      <View style={s.presActions}>
                        {enCarrito > 0 && (
                          <Text style={s.enCarritoSmall}>{enCarrito} en carrito</Text>
                        )}
                        <View style={s.stepper}>
                          <TouchableOpacity
                            style={s.stepBtn}
                            onPress={() => setCantidades(p => ({ ...p, [pres.id]: Math.max(1, (p[pres.id] ?? 1) - 1) }))}
                          >
                            <Text style={s.stepBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={s.stepVal}>{cant}</Text>
                          <TouchableOpacity
                            style={s.stepBtn}
                            onPress={() => setCantidades(p => ({ ...p, [pres.id]: (p[pres.id] ?? 1) + 1 }))}
                          >
                            <Text style={s.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={s.btnAgregar}
                          onPress={() => {
                            agregarPresentacion(modalProd, pres, cant)
                            setCantidades(p => ({ ...p, [pres.id]: 1 }))
                          }}
                        >
                          <Text style={s.btnAgregarText}>Agregar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })
              })}
            </View>
          </ScrollView>
        )}
      </Modal>
    </SafeAreaView>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  nav: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 28, color: "#2563eb", fontWeight: "300" },
  navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#111827" },
  cartBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  cartIcon: { fontSize: 22 },
  cartBadge: { position: "absolute", top: 0, right: 0, backgroundColor: "#2563eb", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  searchBox: { backgroundColor: "#fff", padding: 10 },
  search: { backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827" },

  // Chips
  chipRow: { backgroundColor: "#fff", paddingTop: 6 },
  chipRowContent: { paddingHorizontal: 10, paddingBottom: 6, gap: 6 },
  chip: { backgroundColor: "#f3f4f6", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#e5e7eb" },
  chipActive: { backgroundColor: "#059669", borderColor: "#059669" },
  chipBlue: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  chipBlueActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipIndigo: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  chipIndigoActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  chipText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  chipTextBlue: { color: "#2563eb" },
  chipTextIndigo: { color: "#4f46e5" },
  chipTextActive: { color: "#fff" },
  limpiarRow: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  limpiar: { fontSize: 13, color: "#6b7280" },

  // Grid
  prodCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
  prodImgBox: { aspectRatio: 1, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  prodImg: { width: "100%", height: "100%" },
  prodInfo: { padding: 10 },
  prodNombre: { fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 },
  prodMarca: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  prodPrecio: { fontSize: 13, fontWeight: "800", color: "#2563eb", marginTop: 4 },
  prodSinPrecio: { fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 4 },
  enCarrito: { fontSize: 10, color: "#16a34a", fontWeight: "600", marginTop: 2 },
  btnQuickAdd: { backgroundColor: "#2563eb", margin: 8, marginTop: 0, borderRadius: 10, alignItems: "center", paddingVertical: 7 },
  btnQuickAddText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#9ca3af", fontSize: 15, marginTop: 10 },

  // Modal
  modal: { flex: 1, backgroundColor: "#fff" },
  modalImg: { width: "100%", aspectRatio: 16 / 9 },
  modalImgPlaceholder: { height: 160, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 16 },
  modalNombre: { fontSize: 20, fontWeight: "800", color: "#111827" },
  modalMarca: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  modalCat: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  modalDesc: { fontSize: 14, color: "#6b7280", lineHeight: 20, marginTop: 8, marginBottom: 4 },
  presTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  // Presentacion row
  presRow: { flexDirection: "row", alignItems: "center", padding: 10, borderTopWidth: 1, borderTopColor: "#e5e7eb", gap: 8 },
  presNombre: { fontSize: 13, fontWeight: "600", color: "#374151" },
  presPrecio: { fontSize: 15, fontWeight: "800", color: "#111827", marginTop: 2 },
  presStock: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  presActions: { alignItems: "flex-end", gap: 4 },
  enCarritoSmall: { fontSize: 10, color: "#16a34a", fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 28, height: 28, backgroundColor: "#eff6ff", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 18, fontWeight: "700", color: "#2563eb", lineHeight: 22 },
  stepVal: { fontSize: 15, fontWeight: "800", color: "#111827", minWidth: 24, textAlign: "center" },
  btnAgregar: { backgroundColor: "#2563eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 2 },
  btnAgregarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
})
