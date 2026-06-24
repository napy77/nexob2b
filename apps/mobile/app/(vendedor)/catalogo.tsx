import { useEffect, useState } from "react"
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Image, Modal, ScrollView, Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { useVendedor } from "../../lib/vendedor"
import { getCatalogoVendedor, ApiError } from "../../lib/api"
import { BACKEND_URL } from "../../lib/config"

type Producto = {
  id: string
  nombre: string
  descripcion?: string
  precio: number
  alicuota_iva?: number
  unidad: string
  compra_minima: number
  stock?: number
  imagen_url?: string
  sku?: string
  ean?: string
}

export default function CatalogoVendedorTab() {
  const { token, logout } = useAuth()
  const { addItem, mayorista_id: cartMayoristaId, clearCart } = useCart()
  const { comercioCliente } = useVendedor()
  const [productos, setProductos] = useState<Producto[]>([])
  const [mayoristaId, setMayoristaId] = useState<string | null>(null)
  const [mayoristaNombre, setMayoristaNombre] = useState("")
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState(1)

  useEffect(() => {
    if (!token) return
    getCatalogoVendedor(token)
      .then((data) => {
        setProductos(data.productos || [])
        setMayoristaId(data.mayorista?.id || null)
        setMayoristaNombre(data.mayorista?.nombre || "")
      })
      .catch((e: any) => { if (e instanceof ApiError && e.status === 401) logout() })
      .finally(() => setLoading(false))
  }, [token])

  const abrirDetalle = (p: Producto) => {
    setSeleccionado(p)
    setCantidad(p.compra_minima || 1)
  }

  const handleAgregar = () => {
    if (!seleccionado || !mayoristaId) return
    if (cartMayoristaId && cartMayoristaId !== mayoristaId) {
      clearCart()
    }
    addItem({
      producto_id: seleccionado.id,
      nombre: seleccionado.nombre,
      sku: seleccionado.sku ?? null,
      ean: seleccionado.ean ?? null,
      precio_unitario: seleccionado.precio,
      alicuota_iva: seleccionado.alicuota_iva ?? 21,
      cantidad,
      unidad: seleccionado.unidad,
      imagen_url: seleccionado.imagen_url,
      mayorista_id: mayoristaId,
      mayorista_nombre: mayoristaNombre,
    })
    setSeleccionado(null)
    Alert.alert("✓ Agregado", `${seleccionado.nombre} en el pedido`)
  }

  const filtrados = productos.filter(
    (p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const renderItem = ({ item: p }: { item: Producto }) => (
    <TouchableOpacity style={styles.card} onPress={() => abrirDetalle(p)}>
      <View style={styles.imgBox}>
        {p.imagen_url
          ? <Image source={{ uri: `${BACKEND_URL}${p.imagen_url}` }} style={styles.img} resizeMode="cover" />
          : <Text style={{ fontSize: 32 }}>📦</Text>
        }
      </View>
      <View style={styles.info}>
        <Text style={styles.prodNombre} numberOfLines={2}>{p.nombre}</Text>
        <Text style={styles.prodPrecio}>${p.precio?.toLocaleString("es-AR")} / {p.unidad}</Text>
        <Text style={styles.prodMin}>Mín: {p.compra_minima}</Text>
      </View>
      <TouchableOpacity style={styles.btnAdd} onPress={() => abrirDetalle(p)}>
        <Text style={styles.btnAddText}>+</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.nav}>
        <Text style={styles.navTitle}>Catálogo</Text>
        {comercioCliente
          ? <Text style={styles.navSub}>Pedido para: {comercioCliente.nombre}</Text>
          : <Text style={styles.navWarn}>⚠ Seleccioná un cliente primero</Text>
        }
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.search}
          placeholder="Buscar producto..."
          placeholderTextColor="#9ca3af"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#059669" size="large" />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>📦</Text>
              <Text style={styles.emptyText}>Sin productos</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!seleccionado} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSeleccionado(null)}>
        {seleccionado && (
          <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
            {seleccionado.imagen_url && (
              <Image source={{ uri: `${BACKEND_URL}${seleccionado.imagen_url}` }} style={styles.modalImg} resizeMode="cover" />
            )}
            <View style={styles.modalBody}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <Text style={styles.modalNombre}>{seleccionado.nombre}</Text>
                <TouchableOpacity onPress={() => setSeleccionado(null)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18, color: "#9ca3af" }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>Precio</Text>
                  <Text style={styles.cellValue}>${seleccionado.precio?.toLocaleString("es-AR")}</Text>
                  <Text style={styles.cellSub}>/ {seleccionado.unidad}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>Compra mín.</Text>
                  <Text style={styles.cellValue}>{seleccionado.compra_minima}</Text>
                  <Text style={styles.cellSub}>{seleccionado.unidad}s</Text>
                </View>
              </View>

              <View style={styles.cantBox}>
                <Text style={styles.cantLabel}>Cantidad</Text>
                <View style={styles.cantRow}>
                  <TouchableOpacity style={styles.cantBtn} onPress={() => setCantidad(q => Math.max(seleccionado.compra_minima || 1, q - 1))}>
                    <Text style={styles.cantBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.cantVal}>{cantidad}</Text>
                  <TouchableOpacity style={styles.cantBtn} onPress={() => setCantidad(q => q + 1)}>
                    <Text style={styles.cantBtnText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.cantUnidad}>{seleccionado.unidad}s</Text>
                  {cantidad > 1 && <Text style={styles.cantTotal}>${(seleccionado.precio * cantidad).toLocaleString("es-AR")}</Text>}
                </View>
                <TouchableOpacity
                  style={[styles.btnCart, !comercioCliente && styles.btnCartDisabled]}
                  onPress={comercioCliente ? handleAgregar : () => Alert.alert("Seleccioná un cliente primero")}
                >
                  <Text style={styles.btnCartText}>
                    {comercioCliente ? `Agregar · ${cantidad} ${seleccionado.unidad}s` : "Seleccioná un cliente primero"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f0fdf4" },
  nav: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  navSub: { fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 2 },
  navWarn: { fontSize: 12, color: "#d97706", fontWeight: "600", marginTop: 2 },
  searchBox: { backgroundColor: "#fff", padding: 10 },
  search: { backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: "#111827" },
  card: { flex: 1, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
  imgBox: { aspectRatio: 1, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%" },
  info: { padding: 10 },
  prodNombre: { fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 },
  prodPrecio: { fontSize: 14, fontWeight: "800", color: "#059669", marginTop: 4 },
  prodMin: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  btnAdd: { backgroundColor: "#059669", margin: 8, marginTop: 0, borderRadius: 10, alignItems: "center", paddingVertical: 7 },
  btnAddText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#9ca3af", fontSize: 15, marginTop: 10 },
  modal: { flex: 1, backgroundColor: "#fff" },
  modalImg: { width: "100%", aspectRatio: 16 / 9 },
  modalBody: { padding: 20 },
  modalNombre: { fontSize: 20, fontWeight: "800", color: "#111827", flex: 1, paddingRight: 12 },
  cell: { flex: 1, backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 },
  cellLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" },
  cellValue: { fontSize: 20, fontWeight: "800", color: "#111827" },
  cellSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cantBox: { backgroundColor: "#f0fdf4", borderRadius: 14, padding: 14 },
  cantLabel: { fontSize: 12, fontWeight: "600", color: "#059669", marginBottom: 10 },
  cantRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cantBtn: { width: 36, height: 36, backgroundColor: "#fff", borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#a7f3d0" },
  cantBtnText: { fontSize: 20, fontWeight: "700", color: "#059669" },
  cantVal: { fontSize: 20, fontWeight: "800", color: "#111827", minWidth: 32, textAlign: "center" },
  cantUnidad: { fontSize: 13, color: "#6b7280" },
  cantTotal: { fontSize: 15, fontWeight: "700", color: "#059669", marginLeft: "auto" },
  btnCart: { backgroundColor: "#059669", borderRadius: 12, padding: 14, alignItems: "center" },
  btnCartDisabled: { backgroundColor: "#9ca3af" },
  btnCartText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
