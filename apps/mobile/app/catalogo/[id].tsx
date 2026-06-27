import { useEffect, useState } from "react"
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Image, Modal, ScrollView, Alert, Linking,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { getCatalogoMayorista, ApiError } from "../../lib/api"
import { BACKEND_URL } from "../../lib/config"

type Producto = {
  id: string
  nombre: string
  descripcion?: string
  precio: number | null
  alicuota_iva?: number
  unidad: string
  compra_minima: number
  stock?: number
  imagen_url?: string
  rubro?: string
  pasillo?: string
  sku?: string
  ean?: string
}

type MayoristaInfo = {
  id: string
  nombre: string
  email: string
  telefono?: string
}

type Acceso = {
  mostrarPrecio: boolean
  puedeContactar: boolean
  aceptado: boolean
  solicitud: any
}

export default function CatalogoMayoristaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { token } = useAuth()
  const { addItem, items, mayorista_id: cartMayoristaId, clearCart } = useCart()

  const [mayorista, setMayorista] = useState<MayoristaInfo | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [acceso, setAcceso] = useState<Acceso | null>(null)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState(1)

  useEffect(() => {
    if (!token || !id) return
    getCatalogoMayorista(token, id)
      .then((data) => {
        setMayorista(data.mayorista)
        setProductos(data.productos)
        setAcceso(data.acceso)
      })
      .catch((e: any) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/(auth)/login")
      })
      .finally(() => setLoading(false))
  }, [token, id])

  const abrirDetalle = (p: Producto) => {
    setSeleccionado(p)
    setCantidad(p.compra_minima || 1)
  }

  const handleAgregar = () => {
    if (!seleccionado || !mayorista || seleccionado.precio == null) return
    if (cartMayoristaId && cartMayoristaId !== mayorista.id) {
      Alert.alert(
        "Carrito de otro mayorista",
        `Tu carrito tiene productos de otro mayorista. ¿Vaciarlo y agregar de ${mayorista.nombre}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Vaciar y agregar",
            style: "destructive",
            onPress: () => { clearCart(); doAgregar() },
          },
        ]
      )
      return
    }
    doAgregar()
  }

  const doAgregar = () => {
    if (!seleccionado || !mayorista || seleccionado.precio == null) return
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
      mayorista_id: mayorista.id,
      mayorista_nombre: mayorista.nombre,
    })
    setSeleccionado(null)
  }

  // Agrega directo desde la card (cantidad mínima), sin abrir modal
  const agregarDirecto = (p: Producto) => {
    if (!mayorista || p.precio == null) return
    if (cartMayoristaId && cartMayoristaId !== mayorista.id) {
      Alert.alert(
        "Carrito de otro mayorista",
        `Tu carrito tiene productos de otro mayorista. ¿Vaciarlo y agregar de ${mayorista.nombre}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Vaciar y agregar",
            style: "destructive",
            onPress: () => {
              clearCart()
              addItem({
                producto_id: p.id, nombre: p.nombre, sku: p.sku ?? null, ean: p.ean ?? null,
                precio_unitario: p.precio!, alicuota_iva: p.alicuota_iva ?? 21,
                cantidad: p.compra_minima || 1, unidad: p.unidad,
                imagen_url: p.imagen_url, mayorista_id: mayorista!.id, mayorista_nombre: mayorista!.nombre,
              })
            },
          },
        ]
      )
      return
    }
    addItem({
      producto_id: p.id, nombre: p.nombre, sku: p.sku ?? null, ean: p.ean ?? null,
      precio_unitario: p.precio, alicuota_iva: p.alicuota_iva ?? 21,
      cantidad: p.compra_minima || 1, unidad: p.unidad,
      imagen_url: p.imagen_url, mayorista_id: mayorista.id, mayorista_nombre: mayorista.nombre,
    })
  }

  const filtrados = productos.filter(
    (p) =>
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.pasillo?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const renderItem = ({ item: p }: { item: Producto }) => (
    <View style={styles.prodCard}>
      <TouchableOpacity onPress={() => abrirDetalle(p)} activeOpacity={0.7}>
        <View style={styles.prodImgBox}>
          {p.imagen_url
            ? <Image source={{ uri: `${BACKEND_URL}${p.imagen_url}` }} style={styles.prodImg} resizeMode="cover" />
            : <Text style={{ fontSize: 32 }}>📦</Text>
          }
        </View>
        <View style={styles.prodInfo}>
          <Text style={styles.prodNombre} numberOfLines={2}>{p.nombre}</Text>
          {p.precio != null
            ? <Text style={styles.prodPrecio}>${p.precio.toLocaleString("es-AR")} / {p.unidad}</Text>
            : <Text style={styles.prodSinPrecio}>Precio bajo solicitud</Text>
          }
          <Text style={styles.prodMin}>Mín: {p.compra_minima} {p.unidad}{p.compra_minima !== 1 ? "s" : ""}</Text>
        </View>
      </TouchableOpacity>
      {acceso?.mostrarPrecio && p.precio != null && (
        <TouchableOpacity style={styles.btnAgregar} onPress={() => agregarDirecto(p)}>
          <Text style={styles.btnAgregarText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{mayorista?.nombre || "Catálogo"}</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push("/(tabs)/carrito")}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartMayoristaId && items.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{items.reduce((s, i) => s + i.cantidad, 0)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.search}
          placeholder="Buscar en el catálogo..."
          placeholderTextColor="#9ca3af"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" size="large" />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>📦</Text>
              <Text style={styles.emptyText}>Sin productos</Text>
            </View>
          }
        />
      )}

      {/* Modal detalle */}
      <Modal
        visible={!!seleccionado}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSeleccionado(null)}
      >
        {seleccionado && (
          <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
            {seleccionado.imagen_url && (
              <Image
                source={{ uri: `${BACKEND_URL}${seleccionado.imagen_url}` }}
                style={styles.modalImg}
                resizeMode="cover"
              />
            )}
            <View style={styles.modalBody}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalNombre}>{seleccionado.nombre}</Text>
                <TouchableOpacity onPress={() => setSeleccionado(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {seleccionado.descripcion && (
                <Text style={styles.modalDesc}>{seleccionado.descripcion}</Text>
              )}

              <View style={styles.modalGrid}>
                <View style={styles.modalCell}>
                  <Text style={styles.cellLabel}>Precio</Text>
                  {seleccionado.precio != null
                    ? <>
                        <Text style={styles.cellValue}>${seleccionado.precio.toLocaleString("es-AR")}</Text>
                        <Text style={styles.cellSub}>/ {seleccionado.unidad}</Text>
                      </>
                    : <Text style={styles.cellSub}>Bajo solicitud</Text>
                  }
                </View>
                <View style={styles.modalCell}>
                  <Text style={styles.cellLabel}>Compra mínima</Text>
                  <Text style={styles.cellValue}>{seleccionado.compra_minima}</Text>
                  <Text style={styles.cellSub}>{seleccionado.unidad}{seleccionado.compra_minima !== 1 ? "s" : ""}</Text>
                </View>
                {seleccionado.stock != null && (
                  <View style={styles.modalCell}>
                    <Text style={styles.cellLabel}>Stock</Text>
                    <Text style={styles.cellValue}>{seleccionado.stock}</Text>
                  </View>
                )}
              </View>

              {(seleccionado.sku || seleccionado.ean) && (
                <Text style={styles.skuEan}>
                  {seleccionado.sku ? `SKU: ${seleccionado.sku}` : ""}
                  {seleccionado.sku && seleccionado.ean ? "  ·  " : ""}
                  {seleccionado.ean ? `EAN: ${seleccionado.ean}` : ""}
                </Text>
              )}

              {/* Selector de cantidad + agregar al carrito */}
              {acceso?.mostrarPrecio && seleccionado.precio != null && (
                <View style={styles.cantidadBox}>
                  <Text style={styles.cantidadLabel}>Cantidad</Text>
                  <View style={styles.cantidadRow}>
                    <TouchableOpacity
                      style={styles.cantBtn}
                      onPress={() => setCantidad((q) => Math.max(seleccionado.compra_minima || 1, q - 1))}
                    >
                      <Text style={styles.cantBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.cantValor}>{cantidad}</Text>
                    <TouchableOpacity
                      style={styles.cantBtn}
                      onPress={() => setCantidad((q) => q + 1)}
                    >
                      <Text style={styles.cantBtnText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.cantUnidad}>{seleccionado.unidad}s</Text>
                    {cantidad > 1 && (
                      <Text style={styles.cantTotal}>
                        ${(seleccionado.precio * cantidad).toLocaleString("es-AR")}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity style={styles.btnCart} onPress={handleAgregar}>
                    <Text style={styles.btnCartText}>
                      Agregar al carrito · {cantidad} {seleccionado.unidad}{cantidad !== 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Contacto */}
              {acceso?.puedeContactar && mayorista && (
                <View style={styles.contactBox}>
                  {mayorista.telefono && (
                    <TouchableOpacity
                      style={styles.btnWsp}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/${mayorista.telefono!.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Vi *${seleccionado.nombre}* en Nexo B2B y quiero pedirlo.`)}`
                        )
                      }
                    >
                      <Text style={styles.btnWspText}>💬 Pedir por WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.btnEmail}
                    onPress={() =>
                      Linking.openURL(
                        `mailto:${mayorista.email}?subject=${encodeURIComponent(`Pedido: ${seleccionado.nombre} - Nexo B2B`)}`
                      )
                    }
                  >
                    <Text style={styles.btnEmailText}>✉️ Enviar email</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 28, color: "#2563eb", fontWeight: "300" },
  cartBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  cartIcon: { fontSize: 22 },
  cartBadge: {
    position: "absolute", top: 0, right: 0,
    backgroundColor: "#2563eb", borderRadius: 8,
    minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#111827" },
  searchBox: { backgroundColor: "#fff", padding: 10 },
  search: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: "#111827",
  },
  prodCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  prodImgBox: {
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  prodImg: { width: "100%", height: "100%" },
  prodInfo: { padding: 10, flex: 1 },
  prodNombre: { fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 },
  prodPrecio: { fontSize: 14, fontWeight: "800", color: "#2563eb", marginTop: 4 },
  prodSinPrecio: { fontSize: 12, color: "#9ca3af", fontStyle: "italic", marginTop: 4 },
  prodMin: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  btnAgregar: {
    backgroundColor: "#2563eb",
    margin: 8,
    marginTop: 0,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 7,
  },
  btnAgregarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#9ca3af", fontSize: 15, marginTop: 10 },
  // Modal
  modal: { flex: 1, backgroundColor: "#fff" },
  modalImg: { width: "100%", aspectRatio: 16 / 9 },
  modalBody: { padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalNombre: { fontSize: 20, fontWeight: "800", color: "#111827", flex: 1, paddingRight: 12 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: "#9ca3af" },
  modalDesc: { fontSize: 14, color: "#6b7280", marginBottom: 16, lineHeight: 20 },
  modalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  modalCell: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
  },
  cellLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" },
  cellValue: { fontSize: 20, fontWeight: "800", color: "#111827" },
  cellSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  skuEan: { fontSize: 12, color: "#9ca3af", marginBottom: 16 },
  cantidadBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  cantidadLabel: { fontSize: 12, fontWeight: "600", color: "#1d4ed8", marginBottom: 10 },
  cantidadRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cantBtn: {
    width: 36,
    height: 36,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  cantBtnText: { fontSize: 20, fontWeight: "700", color: "#2563eb" },
  cantValor: { fontSize: 20, fontWeight: "800", color: "#111827", minWidth: 32, textAlign: "center" },
  cantUnidad: { fontSize: 13, color: "#6b7280" },
  cantTotal: { fontSize: 15, fontWeight: "700", color: "#2563eb", marginLeft: "auto" },
  btnCart: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  btnCartText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  contactBox: { gap: 10 },
  btnWsp: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  btnWspText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnEmail: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  btnEmailText: { color: "#374151", fontWeight: "600", fontSize: 15 },
})
