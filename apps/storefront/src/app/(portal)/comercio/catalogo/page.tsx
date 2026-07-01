"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, ApiError } from "../../../../lib/comercio/api"
import { useCart } from "../../../../lib/comercio/cart"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""

type Acceso = {
  mostrarPrecio: boolean
  puedeContactar: boolean
  solicitud: any
  visibilidad: string
  mostrarDesglosado: boolean
}

type Mayorista = {
  id: string
  nombre: string
  telefono?: string | null
  email?: string | null
  contacto_nombre?: string | null
  es_vendedor?: boolean
  ciudad?: string
  provincia?: string
  visibilidad: string
  logo_url?: string | null
}

type Producto = {
  id: string
  nombre: string
  descripcion?: string
  precio: number | null
  alicuota_iva: number
  unidad: string
  compra_minima: number
  stock?: number
  imagen_url?: string
  rubro?: string
  subrubro?: string
  pasillo?: string
  sku?: string
  ean?: string
  mayorista: Mayorista
  acceso: Acceso
}

export default function CatalogoProductosPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filtros
  const [busqueda, setBusqueda] = useState("")
  const [mayoristaFiltro, setMayoristaFiltro] = useState<string | null>(null)
  const [rubroActivo, setRubroActivo] = useState<string | null>(null)
  const [subrubroActivo, setSubrubroActivo] = useState<string | null>(null)
  const [pasilloActivo, setPasilloActivo] = useState<string | null>(null)

  // Modal
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [cantidadModal, setCantidadModal] = useState(1)
  const [solicitando, setSolicitando] = useState<string | null>(null)

  const abrirDetalle = (p: Producto) => {
    setSeleccionado(p)
    setCantidadModal(p.compra_minima || 1)
  }

  const cargar = () => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }
    comerciosApi.getCatalogo(token)
      .then((data) => setProductos(data.productos))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("comercio_token"); router.replace("/comercio/login")
        } else setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [router])

  const handleSolicitar = async (mayoristaId: string) => {
    const token = localStorage.getItem("comercio_token")!
    setSolicitando(mayoristaId)
    try {
      await comerciosApi.solicitarAlta(token, mayoristaId)
      cargar()
    } catch (err: any) {
      if (!err.message.includes("Ya existe")) alert(err.message)
      else cargar()
    } finally {
      setSolicitando(null)
    }
  }

  // Opciones derivadas del conjunto completo de productos
  const mayoristas = [...new Map(productos.map((p) => [p.mayorista.id, p.mayorista])).values()]
  const productosFiltradosPorMayorista = mayoristaFiltro
    ? productos.filter((p) => p.mayorista.id === mayoristaFiltro)
    : productos

  const rubros = [...new Set(productosFiltradosPorMayorista.map((p) => p.rubro).filter(Boolean))] as string[]
  const subrubros = rubroActivo
    ? [...new Set(productosFiltradosPorMayorista.filter((p) => p.rubro === rubroActivo).map((p) => p.subrubro).filter(Boolean))] as string[]
    : []
  const pasillos = [...new Set(productosFiltradosPorMayorista.map((p) => p.pasillo).filter(Boolean))] as string[]

  // Filtrado completo
  const filtrados = productosFiltradosPorMayorista.filter((p) => {
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!p.nombre.toLowerCase().includes(q) &&
          !p.mayorista?.nombre.toLowerCase().includes(q) &&
          !p.rubro?.toLowerCase().includes(q) &&
          !p.subrubro?.toLowerCase().includes(q) &&
          !p.pasillo?.toLowerCase().includes(q)) return false
    }
    if (rubroActivo && p.rubro !== rubroActivo) return false
    if (subrubroActivo && p.subrubro !== subrubroActivo) return false
    if (pasilloActivo && p.pasillo !== pasilloActivo) return false
    return true
  })

  // Agrupar por pasillo
  const grupos = filtrados.reduce((acc, p) => {
    const key = p.pasillo || "General"
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

  const hayFiltros = !!(busqueda || mayoristaFiltro || rubroActivo || subrubroActivo || pasilloActivo)

  const limpiarFiltros = () => {
    setBusqueda("")
    setMayoristaFiltro(null)
    setRubroActivo(null)
    setSubrubroActivo(null)
    setPasilloActivo(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando catálogo...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/comercio/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Catálogo</span>
          </div>
          <span className="text-sm text-gray-400">{filtrados.length} productos</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">

        {/* Buscador */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input type="search" placeholder="Buscar producto, mayorista, rubro..."
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>

        {/* Filtro por mayorista */}
        {mayoristas.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-gray-400">Mayorista:</span>
            {mayoristas.map((m) => (
              <button key={m.id} onClick={() => {
                setMayoristaFiltro(mayoristaFiltro === m.id ? null : m.id)
                setRubroActivo(null); setSubrubroActivo(null); setPasilloActivo(null)
              }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  mayoristaFiltro === m.id
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}>
                {m.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Filtro por rubro */}
        {rubros.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-gray-400">Rubro:</span>
            {rubros.map((r) => (
              <button key={r} onClick={() => {
                setRubroActivo(rubroActivo === r ? null : r)
                setSubrubroActivo(null)
              }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  rubroActivo === r
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}>
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Filtro por subrubro */}
        {subrubros.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-gray-400">Subrubro:</span>
            {subrubros.map((s) => (
              <button key={s} onClick={() => setSubrubroActivo(subrubroActivo === s ? null : s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  subrubroActivo === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Filtro por pasillo */}
        {pasillos.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-gray-400">Pasillo:</span>
            {pasillos.map((p) => (
              <button key={p} onClick={() => setPasilloActivo(pasilloActivo === p ? null : p)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  pasilloActivo === p
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                }`}>
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Resultados + limpiar */}
        {hayFiltros && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>
            <button onClick={limpiarFiltros} className="text-xs text-blue-600 hover:text-blue-800 underline">
              Limpiar filtros
            </button>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

        {filtrados.length === 0 && !error ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">🛒</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Sin productos</h3>
            <p className="text-sm text-gray-500">
              {hayFiltros ? "Probá con otros filtros." : "Todavía no hay productos disponibles en la plataforma."}
            </p>
            {hayFiltros && (
              <button onClick={limpiarFiltros} className="mt-4 text-sm text-blue-600 underline">Limpiar filtros</button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grupos).map(([grupo, items]) => (
              <div key={grupo}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{grupo}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((p) => (
                    <div key={p.id}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => abrirDetalle(p)}>
                      <div className="aspect-video bg-gray-50 overflow-hidden">
                        {p.imagen_url
                          ? <img src={`${BACKEND_URL}${p.imagen_url}`} alt={p.nombre} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                        }
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-blue-600 font-medium mb-0.5">{p.mayorista?.nombre}</p>
                        {(p.rubro || p.subrubro) && (
                          <p className="text-xs text-gray-400 mb-0.5">{[p.rubro, p.subrubro].filter(Boolean).join(" › ")}</p>
                        )}
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{p.nombre}</h3>
                        <div className="mt-1">
                          {p.precio != null ? (
                            p.acceso.mostrarDesglosado ? (
                              <div className="text-xs space-y-0.5">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-base font-bold text-gray-900">${p.precio.toLocaleString("es-AR")}</span>
                                  <span className="text-gray-400">neto</span>
                                </div>
                                {p.alicuota_iva > 0 && (
                                  <div className="text-gray-500">
                                    + IVA {p.alicuota_iva}% = <strong className="text-gray-700">${(p.precio * (1 + p.alicuota_iva / 100)).toLocaleString("es-AR")}</strong>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-baseline gap-1">
                                <span className="text-base font-bold text-gray-900">
                                  ${(p.precio * (1 + p.alicuota_iva / 100)).toLocaleString("es-AR")}
                                </span>
                                <span className="text-xs text-gray-400">/ {p.unidad}</span>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-gray-400 italic">Precio bajo solicitud</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Mín: {p.compra_minima} {p.unidad}{p.compra_minima !== 1 ? "s" : ""}</p>

                        {p.acceso.mostrarPrecio && p.precio != null && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addItem({
                                producto_id: p.id,
                                nombre: p.nombre,
                                sku: p.sku || null,
                                ean: p.ean || null,
                                precio_unitario: p.precio!,
                                alicuota_iva: p.alicuota_iva,
                                cantidad: p.compra_minima || 1,
                                unidad: p.unidad,
                                imagen_url: p.imagen_url,
                                mayorista_id: p.mayorista.id,
                                mayorista_nombre: p.mayorista.nombre,
                              })
                            }}
                            className="mt-2 w-full bg-blue-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                            + Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal detalle */}
      {seleccionado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {seleccionado.imagen_url && (
              <div className="aspect-video bg-gray-50 overflow-hidden rounded-t-2xl">
                <img src={`${BACKEND_URL}${seleccionado.imagen_url}`} alt={seleccionado.nombre} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm text-blue-600 font-medium">{seleccionado.mayorista?.nombre}</p>
                  <h2 className="text-xl font-bold text-gray-900">{seleccionado.nombre}</h2>
                </div>
                <button onClick={() => setSeleccionado(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {(seleccionado.rubro || seleccionado.subrubro || seleccionado.pasillo) && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {seleccionado.rubro && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{seleccionado.rubro}</span>}
                  {seleccionado.subrubro && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{seleccionado.subrubro}</span>}
                  {seleccionado.pasillo && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">🏪 {seleccionado.pasillo}</span>}
                </div>
              )}

              {seleccionado.descripcion && <p className="text-sm text-gray-600 mb-4">{seleccionado.descripcion}</p>}

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">Precio</p>
                  {seleccionado.precio != null ? (
                    seleccionado.acceso.mostrarDesglosado ? (
                      <>
                        <p className="text-xs text-gray-500 mt-1">Neto: <strong className="text-gray-900">${seleccionado.precio.toLocaleString("es-AR")}</strong></p>
                        {seleccionado.alicuota_iva > 0 && (
                          <>
                            <p className="text-xs text-gray-500">+ IVA {seleccionado.alicuota_iva}%: <strong className="text-gray-900">${(seleccionado.precio * seleccionado.alicuota_iva / 100).toLocaleString("es-AR")}</strong></p>
                            <p className="text-xs font-bold text-gray-900 mt-1">Total: ${(seleccionado.precio * (1 + seleccionado.alicuota_iva / 100)).toLocaleString("es-AR")}</p>
                          </>
                        )}
                        <p className="text-gray-400 text-xs mt-0.5">/ {seleccionado.unidad} · Factura A</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-gray-900 text-lg">${(seleccionado.precio * (1 + seleccionado.alicuota_iva / 100)).toLocaleString("es-AR")}</p>
                        <p className="text-gray-400 text-xs">/ {seleccionado.unidad} {seleccionado.alicuota_iva > 0 ? "· IVA inc." : "· sin IVA"}</p>
                      </>
                    )
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-1">Bajo solicitud</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">Compra mínima</p>
                  <p className="font-bold text-gray-900 text-lg">{seleccionado.compra_minima}</p>
                  <p className="text-gray-400 text-xs">{seleccionado.unidad}{seleccionado.compra_minima !== 1 ? "s" : ""}</p>
                </div>
                {seleccionado.stock != null && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">Stock</p>
                    <p className="font-bold text-gray-900">{seleccionado.stock}</p>
                  </div>
                )}
              </div>

              {(seleccionado.sku || seleccionado.ean) && (
                <div className="flex gap-3 text-xs text-gray-400 mb-4">
                  {seleccionado.sku && <span>SKU: {seleccionado.sku}</span>}
                  {seleccionado.ean && <span>EAN: {seleccionado.ean}</span>}
                </div>
              )}

              {seleccionado.acceso.mostrarPrecio && seleccionado.precio != null && (
                <div className="border-t border-gray-100 pt-4 mb-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">Cantidad a pedir</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setCantidadModal((q) => Math.max(seleccionado.compra_minima || 1, q - 1))}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-lg font-medium">−</button>
                      <input type="number" min={seleccionado.compra_minima || 1} value={cantidadModal}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || (seleccionado.compra_minima || 1)
                          setCantidadModal(Math.max(seleccionado.compra_minima || 1, v))
                        }}
                        className="w-14 text-center text-sm font-semibold border-x border-gray-200 h-9 focus:outline-none" />
                      <button onClick={() => setCantidadModal((q) => q + 1)}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-lg font-medium">+</button>
                    </div>
                    <span className="text-xs text-gray-400">{seleccionado.unidad}{cantidadModal !== 1 ? "s" : ""}</span>
                    {cantidadModal > 1 && (
                      <span className="text-xs text-gray-500 ml-auto">
                        Total: <strong className="text-gray-900">
                          ${(seleccionado.precio * (1 + seleccionado.alicuota_iva / 100) * cantidadModal).toLocaleString("es-AR")}
                        </strong>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      addItem({
                        producto_id: seleccionado.id,
                        nombre: seleccionado.nombre,
                        sku: seleccionado.sku || null,
                        ean: seleccionado.ean || null,
                        precio_unitario: seleccionado.precio!,
                        alicuota_iva: seleccionado.alicuota_iva,
                        cantidad: cantidadModal,
                        unidad: seleccionado.unidad,
                        imagen_url: seleccionado.imagen_url,
                        mayorista_id: seleccionado.mayorista.id,
                        mayorista_nombre: seleccionado.mayorista.nombre,
                      })
                      setSeleccionado(null)
                    }}
                    className="mt-3 w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Agregar al carrito · {cantidadModal} {seleccionado.unidad}{cantidadModal !== 1 ? "s" : ""}
                  </button>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 space-y-2">
                {seleccionado.acceso.puedeContactar ? (
                  <>
                    {seleccionado.mayorista?.es_vendedor && seleccionado.mayorista?.contacto_nombre && (
                      <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
                        <span>🧑‍💼</span>
                        <span>Tu vendedor asignado es <strong>{seleccionado.mayorista.contacto_nombre}</strong></span>
                      </div>
                    )}
                    {seleccionado.mayorista?.telefono && (
                      <a href={`https://wa.me/${seleccionado.mayorista.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola${seleccionado.mayorista.es_vendedor ? ` ${seleccionado.mayorista.contacto_nombre}` : ""}! Vi *${seleccionado.nombre}* en Nexo B2B y quiero más información.`
                      )}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp{seleccionado.mayorista.es_vendedor ? ` a ${seleccionado.mayorista.contacto_nombre}` : ""}
                      </a>
                    )}
                    {seleccionado.mayorista?.email && (
                      <a href={`mailto:${seleccionado.mayorista.email}?subject=${encodeURIComponent(`Consulta: ${seleccionado.nombre} - Nexo B2B`)}`}
                        className="flex items-center gap-3 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email{seleccionado.mayorista.es_vendedor ? ` a ${seleccionado.mayorista.contacto_nombre}` : ""}
                      </a>
                    )}
                  </>
                ) : seleccionado.acceso.solicitud?.estado === "pendiente" ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3 text-sm text-center">
                    ⏳ Solicitud pendiente
                  </div>
                ) : seleccionado.acceso.solicitud?.estado === "rechazado" ? (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm text-center">
                    Solicitud rechazada
                  </div>
                ) : (
                  <button onClick={() => handleSolicitar(seleccionado.mayorista.id)}
                    disabled={solicitando === seleccionado.mayorista.id}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                    {solicitando === seleccionado.mayorista.id ? "Solicitando..." : "Solicitar alta para contactar"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
