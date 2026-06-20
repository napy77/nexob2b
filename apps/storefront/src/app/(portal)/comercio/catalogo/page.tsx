"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, ApiError } from "../../../../lib/comercio/api"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""

type Mayorista = {
  id: string
  nombre: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  zonas: string[]
}

type Producto = {
  id: string
  nombre: string
  descripcion?: string
  precio: number
  unidad: string
  compra_minima: number
  stock?: number
  imagen_url?: string
  rubro?: string
  pasillo?: string
  sku?: string
  ean?: string
  activo: boolean
  mayorista: Mayorista
}

export default function CatalogoComercioPase() {
  const router = useRouter()
  const [productos, setProductos] = useState<Producto[]>([])
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [rubroFiltro, setRubroFiltro] = useState("")
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }
    comerciosApi.getCatalogo(token)
      .then((data) => {
        setProductos(data.productos)
        setMayoristas(data.mayoristas)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("comercio_token"); router.replace("/comercio/login")
        } else {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const rubros = [...new Set(productos.map((p) => p.rubro).filter(Boolean))] as string[]

  const productosFiltrados = productos.filter((p) => {
    const matchBusqueda = !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.mayorista?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.rubro?.toLowerCase().includes(busqueda.toLowerCase())
    const matchRubro = !rubroFiltro || p.rubro === rubroFiltro
    return matchBusqueda && matchRubro
  })

  const pasillos = productosFiltrados.reduce((acc, p) => {
    const key = p.pasillo || "General"
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

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
          <span className="text-sm text-gray-400">{productosFiltrados.length} productos</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input
            type="search"
            placeholder="Buscar producto o mayorista..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={rubroFiltro} onChange={(e) => setRubroFiltro(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos los rubros</option>
            {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>
        )}

        {productosFiltrados.length === 0 && !error ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay productos disponibles</h3>
            <p className="text-sm text-gray-500">
              {busqueda || rubroFiltro
                ? "Probá con otros filtros."
                : "Todavía no hay mayoristas con productos en tu zona."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(pasillos).map(([pasillo, items]) => (
              <div key={pasillo}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{pasillo}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((p) => (
                    <button key={p.id} onClick={() => setProductoSeleccionado(p)}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all text-left">
                      <div className="aspect-video bg-gray-50 overflow-hidden">
                        {p.imagen_url ? (
                          <img src={`${BACKEND_URL}${p.imagen_url}`} alt={p.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-blue-600 font-medium mb-0.5">{p.mayorista?.nombre}</p>
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{p.nombre}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-base font-bold text-gray-900">${p.precio.toLocaleString("es-AR")}</span>
                          <span className="text-xs text-gray-400">/ {p.unidad}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Mín: {p.compra_minima} {p.unidad}{p.compra_minima !== 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal detalle producto + contacto */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {productoSeleccionado.imagen_url && (
              <div className="aspect-video bg-gray-50 overflow-hidden rounded-t-2xl">
                <img src={`${BACKEND_URL}${productoSeleccionado.imagen_url}`}
                  alt={productoSeleccionado.nombre} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-blue-600 font-medium">{productoSeleccionado.mayorista?.nombre}</p>
                  <h2 className="text-xl font-bold text-gray-900">{productoSeleccionado.nombre}</h2>
                </div>
                <button onClick={() => setProductoSeleccionado(null)}
                  className="text-gray-400 hover:text-gray-600 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {productoSeleccionado.descripcion && (
                <p className="text-sm text-gray-600 mb-4">{productoSeleccionado.descripcion}</p>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">Precio</p>
                  <p className="font-bold text-gray-900 text-lg">${productoSeleccionado.precio.toLocaleString("es-AR")}</p>
                  <p className="text-gray-400 text-xs">/ {productoSeleccionado.unidad}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">Compra mínima</p>
                  <p className="font-bold text-gray-900 text-lg">{productoSeleccionado.compra_minima}</p>
                  <p className="text-gray-400 text-xs">{productoSeleccionado.unidad}{productoSeleccionado.compra_minima !== 1 ? "s" : ""}</p>
                </div>
                {productoSeleccionado.stock != null && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">Stock</p>
                    <p className="font-bold text-gray-900">{productoSeleccionado.stock} {productoSeleccionado.unidad}s</p>
                  </div>
                )}
                {productoSeleccionado.rubro && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">Rubro</p>
                    <p className="font-semibold text-gray-900">{productoSeleccionado.rubro}</p>
                  </div>
                )}
              </div>

              {(productoSeleccionado.sku || productoSeleccionado.ean) && (
                <div className="flex gap-3 text-xs text-gray-400 mb-4">
                  {productoSeleccionado.sku && <span>SKU: {productoSeleccionado.sku}</span>}
                  {productoSeleccionado.ean && <span>EAN: {productoSeleccionado.ean}</span>}
                </div>
              )}

              {/* Contacto mayorista */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Contactar a {productoSeleccionado.mayorista?.nombre}</p>
                <div className="space-y-2">
                  {productoSeleccionado.mayorista?.telefono && (
                    <a
                      href={`https://wa.me/${productoSeleccionado.mayorista.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola! Vi tu producto *${productoSeleccionado.nombre}* en Nexo B2B y me interesa. ¿Podés darme más info?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Contactar por WhatsApp
                    </a>
                  )}
                  <a href={`mailto:${productoSeleccionado.mayorista?.email}?subject=${encodeURIComponent(
                    `Consulta por ${productoSeleccionado.nombre} - Nexo B2B`
                  )}&body=${encodeURIComponent(
                    `Hola,\n\nVi tu producto "${productoSeleccionado.nombre}" en Nexo B2B y me interesa.\n\n¿Podés darme más información?\n\nSaludos`
                  )}`}
                    className="flex items-center gap-3 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Enviar email
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  {productoSeleccionado.mayorista?.ciudad && productoSeleccionado.mayorista?.provincia
                    ? `${productoSeleccionado.mayorista.ciudad}, ${productoSeleccionado.mayorista.provincia}`
                    : productoSeleccionado.mayorista?.provincia || ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
