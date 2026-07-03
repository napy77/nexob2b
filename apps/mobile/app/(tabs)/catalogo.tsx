import { useEffect, useState, useCallback, useRef } from "react"
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Image, ScrollView, Modal,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { getProductos, getTaxonomia, getComercioMe, ApiError } from "../../lib/api"

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
type Rubro = { id: string; nombre: string; pasillo_id?: string }
type Subrubro = { id: string; nombre: string; rubro_id: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR")
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function CatalogoTab() {
  const { token, logout } = useAuth()
  const { carts, addItem } = useCart()

  // Productos
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [comercioId, setComercioId] = useState<string | null>(null)

  // Búsqueda
  const [busqueda, setBusqueda] = useState("")
  const busquedaTimer = useRef<any>(null)

  // Filtros taxonomía
  const [pasillos, setPasillos] = useState<Pasillo[]>([])
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [subrubros, setSubrubros] = useState<Subrubro[]>([])
  const [pasilloId, setPasilloId] = useState<string | null>(null)
  const [rubroId, setRubroId] = useState<string | null>(null)
  const [subrubroId, setSubrubroId] = useState<string | null>(null)
  const [soloConAlta, setSoloConAlta] = useState(false)

  // Modal
  const [modalProd, setModalProd] = useState<Producto | null>(null)
  // Cantidades por presentacion en el modal
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return
    // Cargar comercio_id y taxonomía en paralelo
    Promise.all([
      getComercioMe(token).then(d => setComercioId(d.comercio?.id || null)).catch(() => {}),
      getTaxonomia().then(d => {
        setPasillos(d.pasillos || [])
        setRubros(d.rubros || [])
        setSubrubros(d.subrubros || [])
      }).catch(() => {}),
    ])
  }, [token])

  // ── Cargar productos ──────────────────────────────────────────────────────

  const cargarProductos = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (busqueda.trim()) params.q = busqueda.trim()
      if (pasilloId) params.pasillo_id = pasilloId
      if (rubroId) params.rubro_id = rubroId
      if (subrubroId) params.subrubro_id = subrubroId
      if (comercioId) params.comercio_id = comercioId
      const data = await getProductos(token, params)
      setProductos(data.productos || [])
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }, [token, busqueda, pasilloId, rubroId, subrubroId, comercioId])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  // ── Búsqueda con debounce ─────────────────────────────────────────────────

  const onBusqueda = (t: string) => {
    setBusqueda(t)
    clearTimeout(busquedaTimer.current)
    busquedaTimer.current = setTimeout(() => {}, 0) // el cambio de estado dispara useEffect
  }

  // ── Filtros client-side ───────────────────────────────────────────────────

  const productosMostrados = soloConAlta
    ? productos.filter(p => p.mayoristas.some(m => m.tiene_alta === true))
    : productos

  // ── Agregar al carrito ────────────────────────────────────────────────────

  const agregarPresentacion = (prod: Producto, mayorista: MayoristaEnProd, pres: Presentacion, cant: number) => {
    addItem({
      producto_id: pres.id,           // usa presentacion_id como key única
      presentacion_id: pres.id,
      nombre: `${prod.nombre} · ${pres.nombre}`,
      sku: null,
      ean: pres.ean_propio || prod.ean || null,
      precio_unitario: pres.precio,
      alicuota_iva: prod.alicuota_iva ?? 21,
      cantidad: cant,
      unidad: prod.unidad_base || "un",
      imagen_url: prod.imagen_url,
      mayorista_id: mayorista.mayorista_id,
      mayorista_nombre: mayorista.mayorista_nombre,
    })
  }

  // ── Render chips de filtro ────────────────────────────────────────────────

  const rubrosDelPasillo = pasilloId
    ? rubros.filter(r => (r as any).pasillo_id === pasilloId || !(r as any).pasillo_id)
    : rubros
  const subrubrosDelRubro = rubroId
    ? subrubros.filter(s => s.rubro_id === rubroId)
    : []

  // ── Producto card ─────────────────────────────────────────────────────────

  const renderProducto = ({ item: prod }: { item: Producto }) => {
    const mejorPrecio = prod.mayoristas
      .flatMap(m => m.presentaciones)
      .reduce<number | null>((min, p) => min === null ? p.precio : Math.min(min, p.precio), null)
    const nMayoristas = prod.mayoristas.length
    const nConAlta = prod.mayoristas.filter(m => m.tiene_alta === true).length

    return (
      <TouchableOpacity
        style={s.prodCard}
        onPress={() => {
          const caps: Record<string, number> = {}
          prod.mayoristas.flatMap(m => m.presentaciones).forEach(p => { caps[p.id] = 1 })
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
          {mejorPrecio != null
            ? <Text style={s.prodPrecio}>desde {fmt(mejorPrecio)}</Text>
            : <Text style={s.prodSinPrecio}>Consultar</Text>
          }
          <Text style={s.prodMeta}>
            {nMayoristas} mayorista{nMayoristas !== 1 ? "s" : ""}
            {nConAlta > 0 && ` · ${nConAlta} con alta`}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  // ── Render total items del carrito ────────────────────────────────────────
  const totalItems = Object.values(carts).flat().reduce((s, i) => s + i.cantidad, 0)

  // ── Vista ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* Nav */}
      <View style={s.nav}>
        <Text style={s.navTitle}>Catálogo</Text>
        {totalItems > 0 && (
          <View style={s.cartBadge}><Text style={s.cartBadgeText}>🛒 {totalItems}</Text></View>
        )}
      </View>

      {/* Buscador */}
      <View style={s.searchBox}>
        <TextInput
          style={s.search}
          placeholder="Buscar producto, marca o EAN..."
          placeholderTextColor="#9ca3af"
          value={busqueda}
          onChangeText={onBusqueda}
          returnKeyType="search"
        />
      </View>

      {/* Chips de filtro */}
      {pasillos.length > 0 && (
        <>
          {/* Pasillos */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipRowContent}>
            {pasillos.map(p => (
              <TouchableOpacity key={p.id} onPress={() => { setPasilloId(pasilloId === p.id ? null : p.id); setRubroId(null); setSubrubroId(null) }}
                style={[s.chip, pasilloId === p.id && s.chipActive]}>
                <Text style={[s.chipText, pasilloId === p.id && s.chipTextActive]}>{p.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Rubros (si hay pasillo seleccionado o rubros disponibles) */}
          {rubros.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chipRow, { marginTop: 0 }]} contentContainerStyle={s.chipRowContent}>
              {rubrosDelPasillo.map(r => (
                <TouchableOpacity key={r.id} onPress={() => { setRubroId(rubroId === r.id ? null : r.id); setSubrubroId(null) }}
                  style={[s.chip, s.chipBlue, rubroId === r.id && s.chipBlueActive]}>
                  <Text style={[s.chipText, s.chipTextBlue, rubroId === r.id && s.chipTextActive]}>{r.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Subrubros (si hay rubro seleccionado) */}
          {rubroId && subrubrosDelRubro.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chipRow, { marginTop: 0 }]} contentContainerStyle={s.chipRowContent}>
              {subrubrosDelRubro.map(sr => (
                <TouchableOpacity key={sr.id} onPress={() => setSubrubroId(subrubroId === sr.id ? null : sr.id)}
                  style={[s.chip, s.chipIndigo, subrubroId === sr.id && s.chipIndigoActive]}>
                  <Text style={[s.chipText, s.chipTextIndigo, subrubroId === sr.id && s.chipTextActive]}>{sr.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Toggle solo con alta + limpiar */}
          <View style={s.toggleRow}>
            <TouchableOpacity onPress={() => setSoloConAlta(v => !v)} style={[s.toggleBtn, soloConAlta && s.toggleBtnActive]}>
              <Text style={[s.toggleText, soloConAlta && s.toggleTextActive]}>✓ Solo con alta</Text>
            </TouchableOpacity>
            {(pasilloId || rubroId || subrubroId || soloConAlta) && (
              <TouchableOpacity onPress={() => { setPasilloId(null); setRubroId(null); setSubrubroId(null); setSoloConAlta(false) }}>
                <Text style={s.limpiar}>✕ Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Lista */}
      {loading
        ? <ActivityIndicator style={{ marginTop: 48 }} color="#2563eb" size="large" />
        : <FlatList
            data={productosMostrados}
            keyExtractor={p => p.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: 40 }}
            refreshing={loading}
            onRefresh={cargarProductos}
            renderItem={renderProducto}
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
            {/* Imagen */}
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

              {/* Mayoristas y presentaciones */}
              <Text style={s.mayoristasTitle}>Disponible en:</Text>
              {modalProd.mayoristas.map(m => {
                const carritoM = carts[m.mayorista_id] || []
                return (
                  <View key={m.listing_id} style={s.mayorCard}>
                    {/* Header mayorista */}
                    <View style={s.mayorHeader}>
                      <View style={s.mayorAvatar}>
                        <Text style={s.mayorAvatarText}>{m.mayorista_nombre[0]}</Text>
                      </View>
                      <Text style={s.mayorNombre}>{m.mayorista_nombre}</Text>
                      {m.tiene_alta === true && (
                        <View style={s.altaBadge}><Text style={s.altaBadgeText}>✓ Alta</Text></View>
                      )}
                      {m.tiene_alta === false && (
                        <View style={s.sinAltaBadge}><Text style={s.sinAltaBadgeText}>Sin alta</Text></View>
                      )}
                    </View>

                    {/* Presentaciones */}
                    {m.presentaciones.map(pres => {
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
                              <Text style={s.enCarrito}>{enCarrito} en carrito</Text>
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
                                agregarPresentacion(modalProd, m, pres, cant)
                                setCantidades(p => ({ ...p, [pres.id]: 1 }))
                              }}
                            >
                              <Text style={s.btnAgregarText}>Agregar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )
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
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  cartBadge: { backgroundColor: "#eff6ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  cartBadgeText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
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
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  toggleBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  toggleBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  toggleText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  toggleTextActive: { color: "#fff" },
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
  prodMeta: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
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
  mayoristasTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  // Mayorista card
  mayorCard: { backgroundColor: "#f9fafb", borderRadius: 14, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "#f0f0f0" },
  mayorHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: "#f3f4f6" },
  mayorAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" },
  mayorAvatarText: { fontSize: 13, fontWeight: "700", color: "#2563eb" },
  mayorNombre: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  altaBadge: { backgroundColor: "#dcfce7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  altaBadgeText: { fontSize: 11, color: "#16a34a", fontWeight: "600" },
  sinAltaBadge: { backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  sinAltaBadgeText: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },

  // Presentacion row
  presRow: { flexDirection: "row", alignItems: "center", padding: 10, borderTopWidth: 1, borderTopColor: "#e5e7eb", gap: 8 },
  presNombre: { fontSize: 13, fontWeight: "600", color: "#374151" },
  presPrecio: { fontSize: 15, fontWeight: "800", color: "#111827", marginTop: 2 },
  presStock: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  presActions: { alignItems: "flex-end", gap: 4 },
  enCarrito: { fontSize: 10, color: "#16a34a", fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 28, height: 28, backgroundColor: "#eff6ff", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 18, fontWeight: "700", color: "#2563eb", lineHeight: 22 },
  stepVal: { fontSize: 15, fontWeight: "800", color: "#111827", minWidth: 24, textAlign: "center" },
  btnAgregar: { backgroundColor: "#2563eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 2 },
  btnAgregarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
})
