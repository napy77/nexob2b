import { useEffect, useState, useCallback } from "react"
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Image, Alert, ScrollView, Modal, Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../lib/auth"
import { useCart } from "../../lib/cart"
import { getMayoristas, getCatalogoMayorista, solicitarAlta, ApiError } from "../../lib/api"
import { BACKEND_URL } from "../../lib/config"

type Mayorista = {
  id: string
  nombre: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  logo_url?: string | null
  visibilidad?: string
  solicitud: { id: string; estado: string } | null
  contacto: { nombre: string; celular: string | null; email: string | null; es_vendedor: boolean }
}

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
  sku?: string
  ean?: string
}

type Acceso = { mostrarPrecio: boolean; puedeContactar: boolean; aceptado: boolean }
type MayoristaInfo = { id: string; nombre: string; email: string; telefono?: string }

export default function CatalogoTab() {
  const { token, logout } = useAuth()
  const { addItem, items, mayorista_id: cartMayoristaId, clearCart } = useCart()

  const [vista, setVista] = useState<"lista" | "catalogo">("lista")

  // ── Lista mayoristas ──────────────────────────────────────────────
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [busquedaLista, setBusquedaLista] = useState("")
  const [solicitando, setSolicitando] = useState<string | null>(null)

  // ── Catálogo productos ────────────────────────────────────────────
  const [mayoristaActual, setMayoristaActual] = useState<MayoristaInfo | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [acceso, setAcceso] = useState<Acceso | null>(null)
  const [loadingCat, setLoadingCat] = useState(false)
  const [busquedaCat, setBusquedaCat] = useState("")
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState(1)

  const cargarLista = useCallback(async () => {
    if (!token) return
    setLoadingLista(true)
    try {
      const data = await getMayoristas(token)
      setMayoristas(data.mayoristas || [])
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
    } finally {
      setLoadingLista(false)
    }
  }, [token])

  useEffect(() => { cargarLista() }, [cargarLista])

  const abrirCatalogo = async (m: Mayorista) => {
    if (!token) return
    setVista("catalogo")
    setMayoristaActual(null)
    setProductos([])
    setAcceso(null)
    setBusquedaCat("")
    setLoadingCat(true)
    try {
      const data = await getCatalogoMayorista(token, m.id)
      setMayoristaActual(data.mayorista)
      setProductos(data.productos || [])
      setAcceso(data.acceso)
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) logout()
      setVista("lista")
    } finally {
      setLoadingCat(false)
    }
  }

  const handleSolicitar = async (mayoristaId: string) => {
    if (!token) return
    setSolicitando(mayoristaId)
    try {
      await solicitarAlta(token, mayoristaId)
      cargarLista()
    } catch (e: any) {
      Alert.alert("Error", e.message)
    } finally {
      setSolicitando(null)
    }
  }

  const doAddItem = (p: Producto, qty: number) => {
    if (!mayoristaActual || p.precio == null) return
    addItem({
      producto_id: p.id, nombre: p.nombre, sku: p.sku ?? null, ean: p.ean ?? null,
      precio_unitario: p.precio, alicuota_iva: p.alicuota_iva ?? 21,
      cantidad: qty, unidad: p.unidad, imagen_url: p.imagen_url,
      mayorista_id: mayoristaActual.id, mayorista_nombre: mayoristaActual.nombre,
    })
  }

  const conConfirmacion = (p: Producto, qty: number, onConfirm: () => void) => {
    if (cartMayoristaId && mayoristaActual && cartMayoristaId !== mayoristaActual.id) {
      Alert.alert("Carrito de otro mayorista", `¿Vaciar y agregar de ${mayoristaActual.nombre}?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Vaciar y agregar", style: "destructive", onPress: () => { clearCart(); onConfirm() } },
      ])
    } else {
      onConfirm()
    }
  }

  const agregarDirecto = (p: Producto) => {
    conConfirmacion(p, p.compra_minima || 1, () => doAddItem(p, p.compra_minima || 1))
  }

  const agregarDesdeModal = () => {
    if (!seleccionado) return
    const prod = seleccionado
    conConfirmacion(prod, cantidad, () => {
      doAddItem(prod, cantidad)
      setSeleccionado(null)
      Alert.alert("✓ Agregado", `${prod.nombre} en tu carrito`)
    })
  }

  const totalItems = items.reduce((s, i) => s + i.cantidad, 0)

  // ══ VISTA LISTA MAYORISTAS ════════════════════════════════════════
  if (vista === "lista") {
    return (
      <SafeAreaView style={sL.root} edges={["top"]}>
        <View style={sL.nav}>
          <Text style={sL.navTitle}>Catálogo</Text>
        </View>
        <View style={sL.searchRow}>
          <TextInput style={sL.search} placeholder="Buscar mayorista o rubro..."
            placeholderTextColor="#9ca3af" value={busquedaLista} onChangeText={setBusquedaLista} />
        </View>
        {loadingLista
          ? <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" size="large" />
          : <FlatList
              data={mayoristas.filter(m =>
                !busquedaLista ||
                m.nombre.toLowerCase().includes(busquedaLista.toLowerCase()) ||
                m.rubros?.some(r => r.toLowerCase().includes(busquedaLista.toLowerCase()))
              )}
              keyExtractor={m => m.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              refreshing={loadingLista}
              onRefresh={cargarLista}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingTop: 60 }}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🏪</Text>
                  <Text style={{ color: "#9ca3af", fontSize: 15 }}>No hay mayoristas disponibles</Text>
                </View>
              }
              renderItem={({ item: m }) => {
                const estado = m.solicitud?.estado
                const aceptado = estado === "aceptado"
                return (
                  <TouchableOpacity style={sL.card} onPress={() => aceptado && abrirCatalogo(m)} activeOpacity={aceptado ? 0.7 : 1}>
                    <View style={sL.cardInner}>
                      <View style={sL.logoBox}>
                        {m.logo_url
                          ? <Image source={{ uri: `${BACKEND_URL}${m.logo_url}` }} style={sL.logo} resizeMode="contain" />
                          : <Text style={sL.logoInitial}>{m.nombre[0]}</Text>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={sL.nombre}>{m.nombre}</Text>
                        {(m.ciudad || m.provincia) && (
                          <Text style={sL.ubicacion}>{[m.ciudad, m.provincia].filter(Boolean).join(", ")}</Text>
                        )}
                        {m.rubros?.length > 0 && (
                          <Text style={sL.rubros} numberOfLines={1}>{m.rubros.slice(0, 3).join(" · ")}</Text>
                        )}
                      </View>
                      <View style={sL.accion}>
                        {aceptado
                          ? <View style={sL.badgeOk}><Text style={sL.badgeOkText}>Ver →</Text></View>
                          : estado === "pendiente"
                            ? <View style={sL.badgePend}><Text style={sL.badgePendText}>Pendiente</Text></View>
                            : <TouchableOpacity
                                style={[sL.btnSolicitar, solicitando === m.id && { opacity: 0.6 }]}
                                onPress={() => handleSolicitar(m.id)}
                                disabled={solicitando === m.id}
                              >
                                {solicitando === m.id
                                  ? <ActivityIndicator size="small" color="#fff" />
                                  : <Text style={sL.btnSolicitarText}>Solicitar</Text>
                                }
                              </TouchableOpacity>
                        }
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
        }
      </SafeAreaView>
    )
  }

  // ══ VISTA CATÁLOGO PRODUCTOS ══════════════════════════════════════
  return (
    <SafeAreaView style={sC.root} edges={["top"]}>
      {/* Nav con back y badge carrito */}
      <View style={sC.nav}>
        <TouchableOpacity onPress={() => setVista("lista")} style={sC.backBtn}>
          <Text style={sC.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={sC.navTitle} numberOfLines={1}>{mayoristaActual?.nombre || "Catálogo"}</Text>
        <View style={sC.cartWrap}>
          <Text style={{ fontSize: 22 }}>🛒</Text>
          {totalItems > 0 && (
            <View style={sC.badge}><Text style={sC.badgeText}>{totalItems}</Text></View>
          )}
        </View>
      </View>

      <View style={sC.searchBox}>
        <TextInput style={sC.search} placeholder="Buscar en el catálogo..."
          placeholderTextColor="#9ca3af" value={busquedaCat} onChangeText={setBusquedaCat} />
      </View>

      {loadingCat
        ? <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" size="large" />
        : <FlatList
            data={productos.filter(p => !busquedaCat || p.nombre.toLowerCase().includes(busquedaCat.toLowerCase()))}
            keyExtractor={p => p.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 60 }}>
                <Text style={{ fontSize: 40 }}>📦</Text>
                <Text style={{ color: "#9ca3af", fontSize: 15, marginTop: 10 }}>Sin productos</Text>
              </View>
            }
            renderItem={({ item: p }) => (
              <View style={sC.prodCard}>
                <TouchableOpacity
                  onPress={() => { setSeleccionado(p); setCantidad(p.compra_minima || 1) }}
                  activeOpacity={0.7}
                >
                  <View style={sC.prodImgBox}>
                    {p.imagen_url
                      ? <Image source={{ uri: `${BACKEND_URL}${p.imagen_url}` }} style={sC.prodImg} resizeMode="cover" />
                      : <Text style={{ fontSize: 32 }}>📦</Text>
                    }
                  </View>
                  <View style={sC.prodInfo}>
                    <Text style={sC.prodNombre} numberOfLines={2}>{p.nombre}</Text>
                    {p.precio != null
                      ? <Text style={sC.prodPrecio}>${p.precio.toLocaleString("es-AR")} / {p.unidad}</Text>
                      : <Text style={sC.prodSinPrecio}>Precio bajo solicitud</Text>
                    }
                    <Text style={sC.prodMin}>Mín: {p.compra_minima} {p.unidad}</Text>
                  </View>
                </TouchableOpacity>
                {acceso?.mostrarPrecio && p.precio != null && (
                  <TouchableOpacity style={sC.btnAgregar} onPress={() => agregarDirecto(p)}>
                    <Text style={sC.btnAgregarText}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
      }

      {/* Modal detalle producto */}
      <Modal
        visible={!!seleccionado}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSeleccionado(null)}
      >
        {seleccionado && (
          <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ paddingBottom: 40 }}>
            {seleccionado.imagen_url && (
              <Image
                source={{ uri: `${BACKEND_URL}${seleccionado.imagen_url}` }}
                style={{ width: "100%", aspectRatio: 16 / 9 }}
                resizeMode="cover"
              />
            )}
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", flex: 1, paddingRight: 12 }}>
                  {seleccionado.nombre}
                </Text>
                <TouchableOpacity onPress={() => setSeleccionado(null)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18, color: "#9ca3af" }}>✕</Text>
                </TouchableOpacity>
              </View>

              {seleccionado.descripcion && (
                <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 16, lineHeight: 20 }}>
                  {seleccionado.descripcion}
                </Text>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" }}>Precio</Text>
                  {seleccionado.precio != null
                    ? <>
                        <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>
                          ${seleccionado.precio.toLocaleString("es-AR")}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#6b7280" }}>/ {seleccionado.unidad}</Text>
                      </>
                    : <Text style={{ fontSize: 12, color: "#6b7280" }}>Bajo solicitud</Text>
                  }
                </View>
                <View style={{ flex: 1, backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" }}>Mín.</Text>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>{seleccionado.compra_minima}</Text>
                  <Text style={{ fontSize: 12, color: "#6b7280" }}>{seleccionado.unidad}s</Text>
                </View>
              </View>

              {acceso?.mostrarPrecio && seleccionado.precio != null && (
                <View style={{ backgroundColor: "#eff6ff", borderRadius: 14, padding: 14, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#1d4ed8", marginBottom: 10 }}>Cantidad</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={{ width: 36, height: 36, backgroundColor: "#fff", borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#bfdbfe" }}
                      onPress={() => setCantidad(q => Math.max(seleccionado.compra_minima || 1, q - 1))}
                    >
                      <Text style={{ fontSize: 20, fontWeight: "700", color: "#2563eb" }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", minWidth: 32, textAlign: "center" }}>{cantidad}</Text>
                    <TouchableOpacity
                      style={{ width: 36, height: 36, backgroundColor: "#fff", borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#bfdbfe" }}
                      onPress={() => setCantidad(q => q + 1)}
                    >
                      <Text style={{ fontSize: 20, fontWeight: "700", color: "#2563eb" }}>+</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 13, color: "#6b7280" }}>{seleccionado.unidad}s</Text>
                    {cantidad > 1 && (
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#2563eb", marginLeft: "auto" }}>
                        ${(seleccionado.precio * cantidad).toLocaleString("es-AR")}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: "#2563eb", borderRadius: 12, padding: 14, alignItems: "center" }}
                    onPress={agregarDesdeModal}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                      Agregar al carrito · {cantidad} {seleccionado.unidad}{cantidad !== 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {acceso?.puedeContactar && mayoristaActual && (
                <View style={{ gap: 10 }}>
                  {mayoristaActual.telefono && (
                    <TouchableOpacity
                      style={{ backgroundColor: "#22c55e", borderRadius: 12, padding: 14, alignItems: "center" }}
                      onPress={() => Linking.openURL(
                        `https://wa.me/${mayoristaActual.telefono!.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Vi *${seleccionado.nombre}* en Nexo B2B y quiero pedirlo.`)}`
                      )}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>💬 Pedir por WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={{ backgroundColor: "#f3f4f6", borderRadius: 12, padding: 14, alignItems: "center" }}
                    onPress={() => Linking.openURL(
                      `mailto:${mayoristaActual.email}?subject=${encodeURIComponent(`Pedido: ${seleccionado.nombre}`)}`
                    )}
                  >
                    <Text style={{ color: "#374151", fontWeight: "600", fontSize: 15 }}>✉️ Enviar email</Text>
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

// ── Estilos lista ──────────────────────────────────────────────────
const sL = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  nav: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  navTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  searchRow: { padding: 12, backgroundColor: "#fff" },
  search: { backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827" },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  logoBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  logo: { width: 48, height: 48 },
  logoInitial: { fontSize: 22, fontWeight: "700", color: "#2563eb" },
  nombre: { fontSize: 15, fontWeight: "700", color: "#111827" },
  ubicacion: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  rubros: { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  accion: { flexShrink: 0 },
  badgeOk: { backgroundColor: "#eff6ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  badgeOkText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  badgePend: { backgroundColor: "#fef3c7", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  badgePendText: { color: "#92400e", fontWeight: "600", fontSize: 12 },
  btnSolicitar: { backgroundColor: "#2563eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, minWidth: 80, alignItems: "center" },
  btnSolicitarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
})

// ── Estilos catálogo ───────────────────────────────────────────────
const sC = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  nav: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 32, color: "#2563eb", lineHeight: 36 },
  navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#111827" },
  cartWrap: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 0, right: 0, backgroundColor: "#2563eb", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  searchBox: { backgroundColor: "#fff", padding: 10 },
  search: { backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: "#111827" },
  prodCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  prodImgBox: { aspectRatio: 1, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  prodImg: { width: "100%", height: "100%" },
  prodInfo: { padding: 10 },
  prodNombre: { fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 },
  prodPrecio: { fontSize: 14, fontWeight: "800", color: "#2563eb", marginTop: 4 },
  prodSinPrecio: { fontSize: 12, color: "#9ca3af", fontStyle: "italic", marginTop: 4 },
  prodMin: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  btnAgregar: { backgroundColor: "#2563eb", margin: 8, marginTop: 0, borderRadius: 10, alignItems: "center", paddingVertical: 7 },
  btnAgregarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
})
