"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const token = () => (typeof localStorage !== "undefined" ? localStorage.getItem("mayorista_token") || "" : "")
const headers = () => ({ "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY, "Content-Type": "application/json" })

type Presentacion = {
  mp_id: string | null; presentacion_id: string; nombre: string; factor: number
  ean_propio: string | null; peso_g: number | null; orden: number
  precio: number; precio_lista: number | null; stock: number; cantidad_minima: number; activo: boolean
}
type Listing = {
  id: string; producto_id: string; ean: string; nombre: string; marca: string | null
  unidad_base: string; alicuota_iva: number; activo: boolean; aprobado: boolean
  producto_estado: string; tiempo_entrega_dias: number | null; pasillo_nombre: string | null
  imagen_url: string | null
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [q, setQ] = useState("")
  const [error, setError] = useState("")
  const PAGE_SIZE = 50
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Búsqueda EAN / nombre en maestro
  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState<ProductoMaestro[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscandoMas, setBuscandoMas] = useState(false)
  const [busquedaPage, setBusquedaPage] = useState(1)
  const [busquedaTotalPages, setBusquedaTotalPages] = useState(1)

  // Modal presentaciones
  const [showPres, setShowPres] = useState<Listing | null>(null)
  const [precioEdit, setPrecioEdit] = useState<Record<string, { precio: string; precio_lista: string; stock: string; cantidad_minima: string }>>({})
  const [saving, setSaving] = useState(false)
  const [savingRow, setSavingRow] = useState<Record<string, boolean>>({})
  const [savedRow, setSavedRow] = useState<Record<string, boolean>>({})

  // Modal proponer nuevo
  const [showNuevo, setShowNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ ean: "", nombre: "", marca: "", unidad_base: "unidad", alicuota_iva: "21", descripcion: "" })

  const cargar = useCallback(async (targetPage = 1) => {
    const append = targetPage > 1
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      params.set("page", String(targetPage))
      params.set("pageSize", String(PAGE_SIZE))
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo?${params}`, { headers: headers() })
      const data = await res.json()
      setListings(prev => append ? [...prev, ...(data.listings || [])] : (data.listings || []))
      setPage(data.page || targetPage)
      setTotalPages(data.totalPages || 1)
      setTotal(data.total ?? (data.listings || []).length)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [q])

  useEffect(() => { cargar(1) }, [cargar])

  const buscarEnMaestro = async (targetPage = 1) => {
    if (!busqueda.trim()) return
    const append = targetPage > 1
    if (append) setBuscandoMas(true); else setBuscando(true)
    try {
      const isEan = /^\d{8,14}$|^NXB-/.test(busqueda.trim())
      const params = new URLSearchParams()
      if (isEan) params.set("ean", busqueda); else params.set("q", busqueda)
      params.set("page", String(targetPage))
      params.set("pageSize", String(PAGE_SIZE))
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo/buscar?${params}`, { headers: headers() })
      const data = await res.json()
      setResultados(prev => append ? [...prev, ...(data.productos || [])] : (data.productos || []))
      setBusquedaPage(data.page || targetPage)
      setBusquedaTotalPages(data.totalPages || 1)
    } catch (e: any) { setError(e.message) }
    finally { setBuscando(false); setBuscandoMas(false) }
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
    const init: Record<string, { precio: string; precio_lista: string; stock: string; cantidad_minima: string }> = {}
    listing.presentaciones.forEach(p => {
      init[p.presentacion_id] = { precio: String(p.precio || ""), precio_lista: String(p.precio_lista || ""), stock: String(p.stock || 0), cantidad_minima: String(p.cantidad_minima ?? 1) }
    })
    setPrecioEdit(init)
  }

  const guardarPresentacion = async (listing_id: string, presentacion_id: string, mp_id: string | null) => {
    const vals = precioEdit[presentacion_id]
    if (!vals?.precio) return
    setSavingRow(v => ({ ...v, [presentacion_id]: true }))
    setSavedRow(v => ({ ...v, [presentacion_id]: false }))
    try {
      let newMpId = mp_id
      if (mp_id) {
        const r = await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo/${listing_id}/presentaciones/${mp_id}`, {
          method: "PUT", headers: headers(),
          body: JSON.stringify({ precio: parseFloat(vals.precio), precio_lista: vals.precio_lista ? parseFloat(vals.precio_lista) : null, stock: parseInt(vals.stock || "0"), cantidad_minima: parseInt(vals.cantidad_minima || "1") }),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Error al guardar") }
      } else {
        const r = await fetch(`${BACKEND_URL}/store/mayoristas/me/catalogo/${listing_id}/presentaciones`, {
          method: "POST", headers: headers(),
          body: JSON.stringify({ presentacion_id, precio: parseFloat(vals.precio), precio_lista: vals.precio_lista ? parseFloat(vals.precio_lista) : null, stock: parseInt(vals.stock || "0"), cantidad_minima: parseInt(vals.cantidad_minima || "1") }),
        })
        const data = await r.json()
        if (data.presentacion?.id) newMpId = data.presentacion.id
      }

      // Actualizar estado local sin recargar página
      const updatePres = (p: Presentacion) => p.presentacion_id !== presentacion_id ? p : {
        ...p,
        mp_id: newMpId,
        precio: parseFloat(vals.precio),
        precio_lista: vals.precio_lista ? parseFloat(vals.precio_lista) : null,
        stock: parseInt(vals.stock || "0"),
        cantidad_minima: parseInt(vals.cantidad_minima || "1"),
        activo: true,
      }
      setListings(prev => prev.map(l => l.id !== listing_id ? l : { ...l, presentaciones: l.presentaciones.map(updatePres) }))
      setShowPres(prev => prev ? { ...prev, presentaciones: prev.presentaciones.map(updatePres) } : prev)

      setSavedRow(v => ({ ...v, [presentacion_id]: true }))
      setTimeout(() => setSavedRow(v => ({ ...v, [presentacion_id]: false })), 2000)
    } catch (e: any) { setError(e.message) }
    finally { setSavingRow(v => ({ ...v, [presentacion_id]: false })) }
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
              onKeyDown={e => e.key === "Enter" && buscarEnMaestro(1)}
              placeholder="Escaneá o ingresá EAN, o buscá por nombre..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={() => buscarEnMaestro(1)} disabled={buscando || !busqueda.trim()}
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
              {busquedaPage < busquedaTotalPages && (
                <div className="flex justify-center pt-1">
                  <button onClick={() => buscarEnMaestro(busquedaPage + 1)} disabled={buscandoMas}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50">
                    {buscandoMas ? "Cargando..." : "Ver más resultados"}
                  </button>
                </div>
              )}
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
        <div className="flex items-center justify-between mb-4">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar mis productos..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm mr-3 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span className="text-sm text-gray-400 shrink-0">{listings.length} de {total}</span>
        </div>

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
                  <div className="flex items-start gap-3">
                    {l.imagen_url
                      ? <img src={l.imagen_url!} alt={l.nombre} className="w-14 h-14 object-cover rounded-xl border border-gray-100 shrink-0" />
                      : <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl shrink-0">📦</div>
                    }
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
                  </div>
                  <div className="flex gap-2 shrink-0">
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
                      <span key={p.presentacion_id} className={`text-xs px-3 py-1 rounded-full font-medium ${p.activo ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
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
            {page < totalPages && (
              <div className="flex justify-center pt-2">
                <button onClick={() => cargar(page + 1)} disabled={loadingMore}
                  className="text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-xl px-5 py-2.5 hover:bg-blue-50 disabled:opacity-50 transition-colors">
                  {loadingMore ? "Cargando..." : "Cargar más productos"}
                </button>
              </div>
            )}
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
                  const vals = precioEdit[p.presentacion_id] || { precio: "", precio_lista: "", stock: "0", cantidad_minima: "1" }
                  return (
                    <div key={p.presentacion_id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-sm text-gray-900">{p.nombre}</span>
                        <span className="text-xs text-gray-400">×{p.factor} unidades base</span>
                        {p.ean_propio && <span className="text-xs font-mono text-gray-400">{p.ean_propio}</span>}
                        {p.peso_g && <span className="text-xs text-gray-400">{p.peso_g}g</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-xs font-medium text-gray-600">
                          Precio *
                          <input type="number" value={vals.precio}
                            onChange={e => setPrecioEdit(v => ({ ...v, [p.presentacion_id]: { ...vals, precio: e.target.value } }))}
                            onBlur={() => guardarPresentacion(showPres.id, p.presentacion_id, p.mp_id || null)}
                            placeholder="0.00"
                            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Precio lista (tachado)
                          <input type="number" value={vals.precio_lista}
                            onChange={e => setPrecioEdit(v => ({ ...v, [p.presentacion_id]: { ...vals, precio_lista: e.target.value } }))}
                            onBlur={() => guardarPresentacion(showPres.id, p.presentacion_id, p.mp_id || null)}
                            placeholder="0.00"
                            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Stock disponible
                          <input type="number" value={vals.stock}
                            onChange={e => setPrecioEdit(v => ({ ...v, [p.presentacion_id]: { ...vals, stock: e.target.value } }))}
                            onBlur={() => guardarPresentacion(showPres.id, p.presentacion_id, p.mp_id || null)}
                            min={0}
                            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </label>
                        <label className="text-xs font-medium text-gray-600">
                          Cant. mínima de venta
                          <input type="number" value={vals.cantidad_minima}
                            onChange={e => setPrecioEdit(v => ({ ...v, [p.presentacion_id]: { ...vals, cantidad_minima: e.target.value } }))}
                            onBlur={() => guardarPresentacion(showPres.id, p.presentacion_id, p.mp_id || null)}
                            min={1}
                            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </label>
                      </div>
                      <div className="mt-2 h-5 text-right text-xs">
                        {savingRow[p.presentacion_id] && <span className="text-gray-400">Guardando...</span>}
                        {savedRow[p.presentacion_id] && <span className="text-green-600 font-medium">✓ Guardado</span>}
                      </div>
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
