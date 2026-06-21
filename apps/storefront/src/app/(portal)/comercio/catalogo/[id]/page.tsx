"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { comerciosApi, ApiError } from "../../../../../lib/comercio/api"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""

type Mayorista = {
  id: string
  nombre: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  visibilidad?: string
}

type Acceso = {
  visibilidad: string
  aceptado: boolean
  mostrarPrecio: boolean
  puedeContactar: boolean
  solicitud: any
}

type Producto = {
  id: string
  nombre: string
  descripcion?: string
  precio: number | null
  unidad: string
  compra_minima: number
  stock?: number
  imagen_url?: string
  rubro?: string
  pasillo?: string
  sku?: string
  ean?: string
}

export default function CatalogoMayoristaPage() {
  const router = useRouter()
  const { id: mayoristaId } = useParams<{ id: string }>()
  const [mayorista, setMayorista] = useState<Mayorista | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [acceso, setAcceso] = useState<Acceso | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)
  const [solicitando, setSolicitando] = useState(false)

  const cargar = () => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }
    comerciosApi.getCatalogoMayorista(token, mayoristaId)
      .then((data) => {
        setMayorista(data.mayorista)
        setProductos(data.productos)
        setAcceso(data.acceso)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("comercio_token"); router.replace("/comercio/login")
        } else {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [router, mayoristaId])

  const handleSolicitar = async () => {
    const token = localStorage.getItem("comercio_token")!
    setSolicitando(true)
    try {
      await comerciosApi.solicitarAlta(token, mayoristaId)
      cargar()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSolicitando(false)
    }
  }

  const filtrados = productos.filter((p) =>
    !busqueda ||
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.rubro?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.pasillo?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const pasillos = filtrados.reduce((acc, p) => {
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
            <button onClick={() => router.push("/comercio/catalogo")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-900">{mayorista?.nombre || "Catálogo"}</span>
          </div>
          <span className="text-sm text-gray-400">{filtrados.length} productos</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {mayorista && acceso && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-gray-900">{mayorista.nombre}</p>
              <p className="text-sm text-gray-500">{[mayorista.ciudad, mayorista.provincia].filter(Boolean).join(", ")}</p>
            </div>
            <div className="flex gap-2">
              {acceso.puedeContactar ? (
                <>
                  {mayorista.telefono && (
                    <a href={`https://wa.me/${mayorista.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Soy cliente de Nexo B2B y quiero hacer un pedido.`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                  <a href={`mailto:${mayorista.email}`}
                    className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                    Email
                  </a>
                </>
              ) : acceso.solicitud?.estado === "pendiente" ? (
                <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-sm font-medium border border-yellow-200">
                  Solicitud pendiente
                </span>
              ) : acceso.solicitud?.estado === "rechazado" ? (
                <span className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-medium border border-red-200">
                  Solicitud rechazada
                </span>
              ) : (
                <button onClick={handleSolicitar} disabled={solicitando}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {solicitando ? "Solicitando..." : "Solicitar alta"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Banner informativo según visibilidad */}
        {acceso && !acceso.aceptado && acceso.visibilidad !== "publico" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {acceso.visibilidad === "sin_precio"
              ? "Los precios están disponibles una vez que el mayorista acepte tu solicitud."
              : "Para contactar a este mayorista necesitás que acepte tu solicitud."}
          </div>
        )}

        <div className="mb-6">
          <input type="search" placeholder="Buscar en el catálogo..." value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>}

        {filtrados.length === 0 && !error ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Sin productos</h3>
            <p className="text-sm text-gray-500">Este mayorista todavía no cargó productos.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(pasillos).map(([pasillo, items]) => (
              <div key={pasillo}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{pasillo}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((p) => (
                    <button key={p.id} onClick={() => setSeleccionado(p)}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all text-left">
                      <div className="aspect-video bg-gray-50 overflow-hidden">
                        {p.imagen_url
                          ? <img src={`${BACKEND_URL}${p.imagen_url}`} alt={p.nombre} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                        }
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{p.nombre}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          {p.precio != null ? (
                            <>
                              <span className="text-base font-bold text-gray-900">${p.precio.toLocaleString("es-AR")}</span>
                              <span className="text-xs text-gray-400">/ {p.unidad}</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Precio bajo solicitud</span>
                          )}
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

      {/* Modal detalle */}
      {seleccionado && mayorista && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {seleccionado.imagen_url && (
              <div className="aspect-video bg-gray-50 overflow-hidden rounded-t-2xl">
                <img src={`${BACKEND_URL}${seleccionado.imagen_url}`} alt={seleccionado.nombre} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{seleccionado.nombre}</h2>
                <button onClick={() => setSeleccionado(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {seleccionado.descripcion && <p className="text-sm text-gray-600 mb-4">{seleccionado.descripcion}</p>}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs">Precio</p>
                  {seleccionado.precio != null ? (
                    <>
                      <p className="font-bold text-gray-900 text-lg">${seleccionado.precio.toLocaleString("es-AR")}</p>
                      <p className="text-gray-400 text-xs">/ {seleccionado.unidad}</p>
                    </>
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
                {seleccionado.rubro && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">Rubro</p>
                    <p className="font-semibold text-gray-900">{seleccionado.rubro}</p>
                  </div>
                )}
              </div>
              {(seleccionado.sku || seleccionado.ean) && (
                <div className="flex gap-3 text-xs text-gray-400 mb-4">
                  {seleccionado.sku && <span>SKU: {seleccionado.sku}</span>}
                  {seleccionado.ean && <span>EAN: {seleccionado.ean}</span>}
                </div>
              )}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                {acceso?.puedeContactar ? (
                  <>
                    {mayorista.telefono && (
                      <a href={`https://wa.me/${mayorista.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Vi *${seleccionado.nombre}* en Nexo B2B y quiero pedirlo. ¿Podés darme info?`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Pedir por WhatsApp
                      </a>
                    )}
                    <a href={`mailto:${mayorista.email}?subject=${encodeURIComponent(`Pedido: ${seleccionado.nombre} - Nexo B2B`)}`}
                      className="flex items-center gap-3 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                      Enviar email
                    </a>
                  </>
                ) : acceso?.solicitud?.estado === "pendiente" ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3 text-sm text-center">
                    Tu solicitud está pendiente de aprobación
                  </div>
                ) : acceso?.solicitud ? (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm text-center">
                    Solicitud rechazada — contactá al mayorista directamente
                  </div>
                ) : (
                  <button onClick={() => { setSeleccionado(null); handleSolicitar() }}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                    Solicitar alta para contactar
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
