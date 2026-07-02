"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const token = () => (typeof localStorage !== "undefined" ? localStorage.getItem("mayorista_token") || "" : "")
const headers = () => ({ "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY, "Content-Type": "application/json" })

type Presentacion = {
  id: string; presentacion_id: string; nombre: string; factor: number
  ean_propio: string | null; peso_g: number | null; orden: number
  precio: number; precio_lista: number | null; stock: number; activo: boolean
}
type Listing = {
  id: string; producto_id: string; ean: string; nombre: string; marca: string | null
  unidad_base: string; alicuota_iva: number; activo: boolean; aprobado: boolean
  producto_estado: string; tiempo_entrega_dias: number | null; pasillo_nombre: string | null
  presentaciones: Presentacion[]
}
type ProductoMaestro = {
  id: string; ean: string; nombre: string; marca: string | null
  unidad_base: string; alicuota_iva: number; estado: string
  presentaciones: { id: string; nombre: string; factor: number; ean_propio: string | null; peso_g: number | null; orden: number }[]
}

export default function CatalogoMayoristaPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [error, setError] = useState("")

  // Búsqueda EAN / nombre en maestro
  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState<ProductoMaestro[]>([])
  const [buscando, setBuscando] = useState(false)

  // Modal presentaciones
  const [showPres, setShowPres] = useState<Listing | null>(null)
  const [precioEdit, setPrecioEdit] = useState<Record<string, { precio: string; precio_lista: string; stock: string }>>({})
  const [saving, setSaving] = useState(false)

  // Modal proponer nuevo
  const [showNuevo, setShowNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ ean: "", nombre: "", marca: "", unidad_base: "unidad", alicuota_iva: "21", descripcion: "" })

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : ""
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo${params}`, { headers: headers() })
      const data = await res.json()
      setListings(data.listings || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [q])

  useEffect(() => { cargar() }, [cargar])

  const buscarEnMaestro = async () => {
    if (!busqueda.trim()) return
    setBuscando(true)
    try {
      const isEan = /^\d{8,14}$|^NXB-/.test(busqueda.trim())
      const params = isEan ? `?ean=${encodeURIComponent(busqueda)}` : `?q=${encodeURIComponent(busqueda)}`
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo/buscar${params}`, { headers: headers() })
      const data = await res.json()
      setResultados(data.productos || [])
    } catch (e: any) { setError(e.message) }
    finally { setBuscando(false) }
  }

  const vincularProducto = async (producto_id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ producto_id }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 409) throw new Error(data.error)
      setResultados([])
      setBusqueda("")
      cargar()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const proponerNuevo = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ ...formNuevo, alicuota_iva: parseFloat(formNuevo.alicuota_iva) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowNuevo(false)
      setFormNuevo({ ean: "", nombre: "", marca: "", unidad_base: "unidad", alicuota_iva: "21", descripcion: "" })
      cargar()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const abrirPresentaciones = (listing: Listing) => {
    setShowPres(listing)
    const init: Record<string, { precio: string; precio_lista: string; stock: string }> = {}
    listing.presentaciones.forEach(p => {
      init[p.presentacion_id] = { precio: String(p.precio || ""), precio_lista: String(p.precio_lista || ""), stock: String(p.stock || 0) }
    })
    setPrecioEdit(init)
  }

  const guardarPresentacion = async (listing_id: string, presentacion_id: string, mp_id: string | null) => {
    const vals = precioEdit[presentacion_id]
    if (!vals?.precio) return
    setSaving(true)
    try {
      if (mp_id) {
        // Actualizar existente
        await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo/${listing_id}/presentaciones/${mp_id}`, {
          method: "PUT", headers: headers(),
          body: JSON.stringify({ precio: parseFloat(vals.precio), precio_lista: vals.precio_lista ? parseFloat(vals.precio_lista) : null, stock: parseInt(vals.stock || "0") }),
        })
      } else {
        // Crear nueva
        await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo/${listing_id}/presentaciones`, {
          method: "POST", headers: headers(),
          body: JSON.stringify({ presentacion_id, precio: parseFloat(vals.precio), precio_lista: vals.precio_lista ? parseFloat(vals.precio_lista) : null, stock: parseInt(vals.stock || "0") }),
        })
      }
      cargar()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const quitarProducto = async (listing_id: string) => {
    if (!confirm("¿Quitar este producto de tu catálogo?")) return
    await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo/${listing_id}`, { method: "DELETE", headers: headers() })
    cargar()
  }

  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)

  // Redirigir al login si el token expiró
  const handleTokenExpirado = () => {
    localStorage.removeItem("mayorista_token")
    router.push("/mayorista/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Cabecera con volver */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/mayorista/dashboard")}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">←</button>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mi catálogo</h1>
              <p className="text-sm text-gray-500 mt-0.5">Productos que ofrecés con tus precios y stock</p>
            </div>
            <button onClick={() => setShowNuevo(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
              + Proponer producto nuevo
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4 flex items-center justify-between">
            <span>{error}</span>
            {(error.toLowerCase().includes("expirado") || error.toLowerCase().includes("autenticación")) && (
              <button onClick={handleTokenExpirado}
                className="ml-4 text-xs font-semibold underline shrink-0">Volver a ingresar</button>
            )}
          </div>
        )}

        {/* Buscador en catálogo maestro */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">🔍 Agregar producto del catálogo maestro</p>
          <div className="flex gap-3">
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscarEnMaestro()}
              placeholder="Escaneá o ingresá EAN, o buscá por nombre..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={buscarEnMaestro} disabled={buscando || !busqueda.trim()}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              {buscando ? "..." : "Buscar"}
            </button>
          </div>

          {resultados.length > 0 && (
            <div className="mt-3 space-y-2">
              {resultados.map(p => {
                const yaEnCatalogo = listings.some(l => l.producto_id === p.id)
                return (
                  <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.nombre}</p>
                      <p className="text-xs text-gray-500">{p.marca && `${p.marca} · `}{p.ean} · {p.unidad_base} · IVA {p.alicuota_iva}%</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.presentaciones?.length || 0} presentación(es) definidas</p>
                    </div>
                    {yaEnCatalogo ? (
                      <span className="text-xs text-green-700 bg-green-50 px-3 py-1 rounded-full font-medium">Ya en tu catálogo</span>
                    ) : (
                      <button onClick={() => vincularProducto(p.id)} disabled={saving}
                        className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-60">
                        + Agregar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {resultados.length === 0 && busqueda && !buscando && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              No encontramos el producto en el catálogo.{" "}
              <button onClick={() => setShowNuevo(true)} className="text-blue-600 underline">Proponelo como nuevo</button>
            </p>
          )}
        </div>

        {/* Filtro mis productos */}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar mis productos..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400" />

        {/* Lista de listings */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando catálogo...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">📦</span>
            <p className="text-gray-500 text-sm">Todavía no tenés productos en tu catálogo.<br/>Buscá uno arriba o proponé uno nuevo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map(l => (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{l.nombre}</h3>
                      {!l.aprobado && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pendiente aprobación</span>
                      )}
                      {!l.activo && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {l.marca && `${l.marca} · `}EAN: {l.ean} · {l.unidad_base} · IVA {l.alicuota_iva}%
                      {l.pasillo_nombre && ` · ${l.pasillo_nombre}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => abrirPresentaciones(l)}
                      className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-purple-100">
                      💰 Precios y stock ({l.presentaciones.length})
                    </button>
                    <button onClick={() => quitarProducto(l.id)}
                      className="text-xs bg-gray-50 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600">
                      Quitar
                    </button>
                  </div>
                </div>

                {/* Resumen presentaciones */}
                {l.presentaciones.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {l.presentaciones.map(p => (
                      <span key={p.id} className={`text-xs px-3 py-1 rounded-full font-medium ${p.activo ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                        {p.nombre} → {fmt(p.precio)} · Stock: {p.stock}
                      </span>
                    ))}
                  </div>
                )}
                {l.presentaciones.length === 0 && l.aprobado && (
                  <p className="text-xs text-amber-600 mt-2">⚠️ Sin precios configurados — el producto no aparece en el catálogo</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal precios y stock */}
      {showPres && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-bold text-gray-900">{showPres.nombre}</h2>
                <p className="text-xs text-gray-500">{showPres.ean} · IVA {showPres.alicuota_iva}%</p>
              </div>
              <button onClick={() => setShowPres(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {showPres.presentaciones.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Este producto no tiene presentaciones definidas en el catálogo maestro.<br/>
                Pedile al administrador que las configure.
              </div>
            ) : (
              <div className="space-y-3">
                {showPres.presentaciones.map(p => {
                  const vals = precioEdit[p.presentacion_id] || { precio: "", precio_lista: "", stock: "0" }
                  return (
                    <div key={p.presentacion_id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-sm text-gray-900">{p.nombre}</span>
                        <span className="text-xs text-gray-400">×{p.factor} unidades base</span>
                        {p.ean_propio && <span className="text-xs font-mono text-gray-400">{p.ean_propio}</span>}
                        {p.peso_g && <span className="text-xs text-gray-400">{p.peso_g}g</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <label className="text-xs font-medium text-gray-600">
                          Precio *
                          <input type="number" value={vals.precio} onChange={e => setPrecioEdit(v => ({ ...v, [p.presentacion_id]: { ...vals, precio: e.target.value } }))}
                            placeholder="0.00"
                            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Precio lista (tachado)
                          <input type="number" value={vals.precio_lista} onChange={e => setPrecioEdit(v => ({ ...v, [p.presentacion_id]: { ...vals, precio_lista: e.target.value } }))}
                            placeholder="0.00"
                            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Stock disponible
                          <input type="number" value={vals.stock} onChange={e => setPrecioEdit(v => ({ ...v, [p.presentacion_id]: { ...vals, stock: e.target.value } }))}
                            min={0}
                            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </label>
                      </div>
                      <button
                        onClick={() => guardarPresentacion(showPres.id, p.presentacion_id, p.id || null)}
                        disabled={saving || !vals.precio}
                        className="mt-3 w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                        {saving ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal proponer nuevo producto */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-gray-900 mb-4">Proponer producto nuevo</h2>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-4">
              El producto quedará pendiente de aprobación por el administrador antes de aparecer en el catálogo.
            </p>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-600">
                EAN / Código de barras <span className="text-gray-400">(opcional, se genera uno interno si no tenés)</span>
                <input value={formNuevo.ean} onChange={e => setFormNuevo(f => ({ ...f, ean: e.target.value }))}
                  placeholder="7790123456789"
                  className="mt-1 block w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Nombre del producto *
                <input value={formNuevo.nombre} onChange={e => setFormNuevo(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Azúcar Ledesma 1kg"
                  className="mt-1 block w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-gray-600">
                  Marca
                  <input value={formNuevo.marca} onChange={e => setFormNuevo(f => ({ ...f, marca: e.target.value }))}
                    className="mt-1 block w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </label>
                <label className="block text-xs font-medium text-gray-600">
                  Unidad base
                  <input value={formNuevo.unidad_base} onChange={e => setFormNuevo(f => ({ ...f, unidad_base: e.target.value }))}
                    placeholder="unidad, kg, litro..."
                    className="mt-1 block w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </label>
              </div>
              <label className="block text-xs font-medium text-gray-600">
                Alícuota IVA
                <select value={formNuevo.alicuota_iva} onChange={e => setFormNuevo(f => ({ ...f, alicuota_iva: e.target.value }))}
                  className="mt-1 block w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {[0, 10.5, 21, 27].map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNuevo(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={proponerNuevo} disabled={saving || !formNuevo.nombre}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Enviando..." : "Proponer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
