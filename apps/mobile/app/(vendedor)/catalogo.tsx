import { useEffect, useState, useCallback, useRef } from "react"
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Image, Modal, ScrollView, Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { useVendedor } from "../../lib/vendedor"
import { getProductos, getTaxonomia, ApiError } from "../../lib/api"

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Presentacion = {
  id: string
  presentacion_id: string
  nombre: string
  factor: number
  precio: number
  stock?: number
  ean_propio?: string
}

type MayoristaEnProd = {
  listing_id: string
  mayorista_id: string
  mayorista_nombre: string
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
  mayoristas: MayoristaEnProd[]
}

type Pasillo = { id: string; nombre: string }
type Rubro = { id: string; nombre: string; pasillo_id?: string }
type Subrubro = { id: string; nombre: string; rubro_id: string }

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR")
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function CatalogoVendedorTab() {
  const { token, logout, mayorista_id } = useAuth()
  const { carts, addItem } = useCart()
  const { comercioCliente } = useVendedor()

  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  // Búsqueda
  const [busqueda, setBusqueda] = useState("")
  const busquedaTimer = useRef<any>(null)

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

  // ── Carga inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    getTaxonomia().then(d => {
      setPasillos(d.pasillos || [])
      setRubros(d.rubros || [])
      setSubrubros(d.subrubros || [])
    }).catch(() => {})
  }, [])

  // ── Cargar productos ──────────────────────────────────────────────────────

  const cargarProductos = useCallback(async () => {
    if (!token || !mayorista_id) return
    setLoading(true)
    try {
      const params: Record<string, string> = { mayorista_id }
      if (busqueda.trim()) params.q = busqueda.trim()
      if (pasilloId) params.pasillo_id = pasilloId
      if (rubroId) params.rubro_id = rubroId
      if (subrubroId) params.subrubro_id = subrubroId
      const data = await getProductos(token, params)
      setProductos(data.productos || [])
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoading(false)
    }
  }, [token, mayorista_id, busqueda, pasilloId, rubroId, subrubroId])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  // ── Agregar al carrito ────────────────────────────────────────────────────

  const agregarPresentacion = (prod: Producto, m: MayoristaEnProd, pres: Presentacion, cant: number) => {
    if (!comercioCliente) {
      Alert.alert("Seleccioná un cliente primero")
      return
    }
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

  // ── Filtros derivados ─────────────────────────────────────────────────────

  const rubrosDelPasillo = pasilloId
    ? rubros.filter(r => (r as any).pasillo_id === pasilloId || !(r as any).pasillo_id)
    : rubros
  const subrubrosDelRubro = rubroId ? subrubros.filter(s => s.rubro_id === rubroId) : []

  // ── Render card ───────────────────────────────────────────────────────────

  const renderItem = ({ item: prod }: { item: Producto }) => {
    const m = prod.mayoristas[0]
    if (!m) return null
    const mejorPrecio = m.presentaciones.reduce<number | null>(
      (min, p) => min === null ? p.precio : Math.min(min, p.precio), null
    )
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => {
          const caps: Record<string, number> = {}
          m.presentaciones.forEach(p => { caps[p.id] = 1 })
          setCantidades(caps)
          setModalProd(prod)
        }}
        activeOpacity={0.8}
      >
        <View style={s.imgBox}>
          {prod.imagen_url
            ? <Image source={{ uri: prod.imagen_url }} style={s.img} resizeMode="cover" />
            : <Text style={{ fontSize: 36 }}>📦</Text>
          }
        </View>
        <View style={s.info}>
          <Text style={s.nombre} numberOfLines={2}>{prod.nombre}</Text>
          {prod.marca && <Text style={s.marca}>{prod.marca}</Text>}
          {mejorPrecio != null
            ? <Text style={s.precio}>{fmt(mejorPrecio)}</Text>
            : <Text style={s.sinPrecio}>Consultar</Text>
          }
          {prod.pasillo_nombre && <Text style={s.cat}>{prod.pasillo_nombre}</Text>}
        </View>
      </TouchableOpacity>
    )
  }

  // ── Vista ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* Nav */}
      <View style={s.nav}>
        <Text style={s.navTitle}>Catálogo</Text>
        {comercioCliente
          ? <Text style={s.navSub}>Para: {comercioCliente.nombre}</Text>
          : <Text style={s.navWarn}>⚠ Seleccioná un cliente</Text>
        }
      </View>

      {/* Búsqueda */}
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
              <TouchableOpacity key={p.id} onPress={() => { setPasilloId(pasilloId === p.id ? null : p.id); setRubroId(null); setSubrubroId(null) }}
                style={[s.chip, pasilloId === p.id && s.chipActive]}>
                <Text style={[s.chipText, pasilloId === p.id && s.chipTextActive]}>{p.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
        ? <ActivityIndicator style={{ marginTop: 48 }} color="#059669" size="large" />
        : <FlatList
            data={productos}
            keyExtractor={p => p.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ padding: 10, gap: 10, paddingBottom: 40 }}
            refreshing={loading}
            onRefresh={cargarProductos}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 42 }}>📦</Text>
                <Text style={s.emptyText}>Sin productos</Text>
              </View>
            }
          />
      }

      {/* ── MODAL DETALLE ─────────────────────────────────────────────────────── */}
      <Modal
        visible={!!modalProd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalProd(null)}
      >
        {modalProd && (() => {
          const m = modalProd.mayoristas[0]
          if (!m) return null
          const carritoM = carts[m.mayorista_id] || []
          return (
            <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 48 }}>
              {modalProd.imagen_url
                ? <Image source={{ uri: modalProd.imagen_url }} style={s.modalImg} resizeMode="cover" />
                : <View style={s.modalImgPlaceholder}><Text style={{ fontSize: 60 }}>📦</Text></View>
              }
              <View style={s.modalBody}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={s.modalNombre}>{modalProd.nombre}</Text>
                    {modalProd.marca && <Text style={s.modalMarca}>{modalProd.marca}</Text>}
                    {modalProd.pasillo_nombre && (
                      <Text style={s.modalCat}>{[modalProd.pasillo_nombre, modalProd.rubro_nombre].filter(Boolean).join(" › ")}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setModalProd(null)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 18, color: "#9ca3af" }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {modalProd.descripcion && (
                  <Text style={s.modalDesc}>{modalProd.descripcion}</Text>
                )}

                <Text style={s.presTitle}>Presentaciones</Text>

                {m.presentaciones.map(pres => {
                  const enCarrito = carritoM.find(c => c.producto_id === pres.id)?.cantidad || 0
                  const cant = cantidades[pres.id] ?? 1
                  return (
                    <View key={pres.id} style={s.presRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.presNombre}>{pres.nombre}</Text>
                        <Text style={s.presPrecio}>{fmt(pres.precio)}</Text>
                        {pres.stock != null && <Text style={s.presStock}>Stock: {pres.stock}</Text>}
                        {enCarrito > 0 && <Text style={s.enCarrito}>{enCarrito} en pedido</Text>}
                      </View>
                      <View style={s.presActions}>
                        <View style={s.stepper}>
                          <TouchableOpacity style={s.stepBtn} onPress={() => setCantidades(p => ({ ...p, [pres.id]: Math.max(1, (p[pres.id] ?? 1) - 1) }))}>
                            <Text style={s.stepBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={s.stepVal}>{cant}</Text>
                          <TouchableOpacity style={s.stepBtn} onPress={() => setCantidades(p => ({ ...p, [pres.id]: (p[pres.id] ?? 1) + 1 }))}>
                            <Text style={s.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={[s.btnAgregar, !comercioCliente && s.btnAgregarDisabled]}
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
            </ScrollView>
          )
        })()}
      </Modal>
    </SafeAreaView>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0fdf4" },
  nav: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  navSub: { fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  navWarn: { fontSize: 12, color: "#d97706", fontWeight: "600", marginTop: 2 },
  searchBox: { backgroundColor: "#fff", padding: 10 },
  search: { backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: "#111827" },

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
  limpiarRow: { backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  limpiar: { fontSize: 13, color: "#6b7280" },

  // Grid
  card: { flex: 1, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
  imgBox: { aspectRatio: 1, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%" },
  info: { padding: 10 },
  nombre: { fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 },
  marca: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  precio: { fontSize: 14, fontWeight: "800", color: "#059669", marginTop: 4 },
  sinPrecio: { fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 4 },
  cat: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
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
  modalDesc: { fontSize: 14, color: "#6b7280", lineHeight: 20, marginTop: 8 },
  presTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  presRow: { flexDirection: "row", alignItems: "center", padding: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0", gap: 8 },
  presNombre: { fontSize: 13, fontWeight: "600", color: "#374151" },
  presPrecio: { fontSize: 16, fontWeight: "800", color: "#059669", marginTop: 2 },
  presStock: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  enCarrito: { fontSize: 10, color: "#059669", fontWeight: "600", marginTop: 2 },
  presActions: { alignItems: "flex-end", gap: 6 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 30, height: 30, backgroundColor: "#f0fdf4", borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#a7f3d0" },
  stepBtnText: { fontSize: 18, fontWeight: "700", color: "#059669", lineHeight: 22 },
  stepVal: { fontSize: 15, fontWeight: "800", color: "#111827", minWidth: 24, textAlign: "center" },
  btnAgregar: { backgroundColor: "#059669", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  btnAgregarDisabled: { backgroundColor: "#9ca3af" },
  btnAgregarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
})
