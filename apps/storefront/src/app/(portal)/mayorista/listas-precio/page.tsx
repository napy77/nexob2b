"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type Lista = {
  id: string
  nombre: string
  descuento_porcentaje: number
  cantidad_items: number
  cantidad_contactos: number
  created_at: string
}

type ListaDetalle = Lista & {
  items: ItemDetalle[]
}

type ItemDetalle = {
  producto_id: string
  producto_nombre: string
  sku: string
  precio_base: number | null
  precio_fijo: number
  unidad: string
}

type Producto = {
  id: string
  nombre: string
  sku: string
  precio: number | null
  unidad: string
}

export default function ListasPrecioPage() {
  const router = useRouter()
  const [listas, setListas] = useState<Lista[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<"lista" | "detalle">("lista")
  const [detalleActual, setDetalleActual] = useState<ListaDetalle | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  // Modal crear/editar lista
  const [modalLista, setModalLista] = useState(false)
  const [editandoLista, setEditandoLista] = useState<Lista | null>(null)
  const [formNombre, setFormNombre] = useState("")
  const [formDescuento, setFormDescuento] = useState("0")
  const [guardandoLista, setGuardandoLista] = useState(false)

  // Modal agregar item
  const [modalItem, setModalItem] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [formProductoId, setFormProductoId] = useState("")
  const [formPrecioFijo, setFormPrecioFijo] = useState("")
  const [guardandoItem, setGuardandoItem] = useState(false)

  const [eliminandoItem, setEliminandoItem] = useState<string | null>(null)
  const [eliminandoLista, setEliminandoLista] = useState(false)

  const token = () => localStorage.getItem("mayorista_token") || ""

  const headers = (ct = true) => ({
    ...(ct ? { "Content-Type": "application/json" } : {}),
    "Authorization": `Bearer ${token()}`,
    "x-publishable-api-key": PUB_KEY,
  })

  const cargarListas = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/listas-precio`, { headers: headers(false) })
      if (res.status === 401) { router.replace("/mayorista/login"); return }
      const data = await res.json()
      setListas(data.listas || [])
    } catch {}
    finally { setLoading(false) }
  }

  const cargarDetalle = async (id: string) => {
    setLoadingDetalle(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/listas-precio/${id}`, { headers: headers(false) })
      const data = await res.json()
      setDetalleActual(data.lista)
      setVista("detalle")
    } catch {}
    finally { setLoadingDetalle(false) }
  }

  const cargarProductos = async (listaId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/productos`, { headers: headers(false) })
      const data = await res.json()
      const idsEnLista = new Set((detalleActual?.items || []).map((i) => i.producto_id))
      setProductos((data.productos || []).filter((p: Producto) => !idsEnLista.has(p.id)))
    } catch {}
  }

  useEffect(() => { cargarListas() }, [])

  const abrirModalCrear = () => {
    setEditandoLista(null)
    setFormNombre("")
    setFormDescuento("0")
    setModalLista(true)
  }

  const abrirModalEditar = (lista: Lista) => {
    setEditandoLista(lista)
    setFormNombre(lista.nombre)
    setFormDescuento(String(lista.descuento_porcentaje))
    setModalLista(true)
  }

  const guardarLista = async () => {
    if (!formNombre.trim()) return
    setGuardandoLista(true)
    try {
      const url = editandoLista
        ? `${BACKEND_URL}/store/mayoristas/me/listas-precio/${editandoLista.id}`
        : `${BACKEND_URL}/store/mayoristas/me/listas-precio`
      const method = editandoLista ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: headers(),
        body: JSON.stringify({ nombre: formNombre.trim(), descuento_porcentaje: parseFloat(formDescuento) || 0 }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setModalLista(false)
      await cargarListas()
      // Si estamos en detalle, recargar
      if (editandoLista && detalleActual?.id === editandoLista.id) {
        await cargarDetalle(editandoLista.id)
      }
    } catch (e: any) { alert(e.message) }
    finally { setGuardandoLista(false) }
  }

  const eliminarLista = async () => {
    if (!detalleActual) return
    const ok = confirm(`¿Eliminar la lista "${detalleActual.nombre}"? Los ${detalleActual.cantidad_contactos} contacto(s) asignado(s) perderán sus precios personalizados.`)
    if (!ok) return
    setEliminandoLista(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/listas-precio/${detalleActual.id}`, {
        method: "DELETE",
        headers: headers(false),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setVista("lista")
      setDetalleActual(null)
      await cargarListas()
    } catch (e: any) { alert(e.message) }
    finally { setEliminandoLista(false) }
  }

  const abrirModalItem = async () => {
    if (!detalleActual) return
    await cargarProductos(detalleActual.id)
    setFormProductoId("")
    setFormPrecioFijo("")
    setModalItem(true)
  }

  const guardarItem = async () => {
    if (!detalleActual || !formProductoId || !formPrecioFijo) return
    setGuardandoItem(true)
    try {
      const res = await fetch(
        `${BACKEND_URL}/store/mayoristas/me/listas-precio/${detalleActual.id}/items`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ producto_id: formProductoId, precio_fijo: parseFloat(formPrecioFijo) }),
        }
      )
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setModalItem(false)
      await cargarDetalle(detalleActual.id)
    } catch (e: any) { alert(e.message) }
    finally { setGuardandoItem(false) }
  }

  const eliminarItem = async (productoId: string) => {
    if (!detalleActual) return
    setEliminandoItem(productoId)
    try {
      const res = await fetch(
        `${BACKEND_URL}/store/mayoristas/me/listas-precio/${detalleActual.id}/items?producto_id=${productoId}`,
        { method: "DELETE", headers: headers(false) }
      )
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await cargarDetalle(detalleActual.id)
    } catch (e: any) { alert(e.message) }
    finally { setEliminandoItem(null) }
  }

  const productoSeleccionado = productos.find((p) => p.id === formProductoId)
  const ahorroPct = productoSeleccionado?.precio && formPrecioFijo
    ? Math.round((1 - parseFloat(formPrecioFijo) / productoSeleccionado.precio) * 100)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => vista === "detalle" ? (setVista("lista"), setDetalleActual(null)) : router.push("/mayorista/dashboard")}
            className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">
            {vista === "detalle" && detalleActual ? detalleActual.nombre : "Listas de precios"}
          </span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-6">

        {/* ── VISTA LISTA ── */}
        {vista === "lista" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Listas de precios</h1>
                <p className="text-sm text-gray-500 mt-0.5">Creá precios personalizados para tus comercios</p>
              </div>
              <button
                onClick={abrirModalCrear}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                + Nueva lista
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
            ) : listas.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-4xl mb-4">🏷️</div>
                <h3 className="font-semibold text-gray-800 mb-2">No tenés listas de precios</h3>
                <p className="text-gray-500 text-sm mb-6">Creá una lista para aplicar descuentos o precios fijos a grupos de comercios</p>
                <button
                  onClick={abrirModalCrear}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                  Crear primera lista
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {listas.map((lista) => (
                  <div key={lista.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between gap-4 hover:border-gray-200 transition-colors cursor-pointer"
                    onClick={() => cargarDetalle(lista.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{lista.nombre}</h3>
                        {lista.descuento_porcentaje > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            −{lista.descuento_porcentaje}% global
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>{lista.cantidad_items} producto{lista.cantidad_items !== 1 ? "s" : ""} con precio fijo</span>
                        <span>{lista.cantidad_contactos} contacto{lista.cantidad_contactos !== 1 ? "s" : ""} asignado{lista.cantidad_contactos !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── VISTA DETALLE ── */}
        {vista === "detalle" && (
          <>
            {loadingDetalle ? (
              <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
            ) : detalleActual ? (
              <>
                {/* Header detalle */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-900">{detalleActual.nombre}</h2>
                        {detalleActual.descuento_porcentaje > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            −{detalleActual.descuento_porcentaje}% en todos los productos
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>{detalleActual.cantidad_contactos} contacto{detalleActual.cantidad_contactos !== 1 ? "s" : ""} asignado{detalleActual.cantidad_contactos !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => abrirModalEditar(detalleActual)}
                        className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                        Editar
                      </button>
                      <button
                        onClick={eliminarLista}
                        disabled={eliminandoLista}
                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-60">
                        {eliminandoLista ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </div>

                  {detalleActual.descuento_porcentaje === 0 && detalleActual.cantidad_items === 0 && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2 text-xs text-yellow-700">
                      Esta lista no tiene descuento global ni precios fijos. Agregá productos o configurá un descuento %.
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 text-sm">Precios fijos por producto</h3>
                  <button
                    onClick={abrirModalItem}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                    + Agregar producto
                  </button>
                </div>

                {detalleActual.items.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <p className="text-gray-400 text-sm">No hay productos con precio fijo en esta lista.</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {detalleActual.descuento_porcentaje > 0
                        ? `Se aplica −${detalleActual.descuento_porcentaje}% a todos los productos.`
                        : "Agregá productos para definir precios individuales."}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {detalleActual.items.map((item, idx) => {
                      const ahorro = item.precio_base
                        ? Math.round((1 - item.precio_fijo / item.precio_base) * 100)
                        : null
                      return (
                        <div key={item.producto_id}
                          className={`flex items-center gap-4 px-5 py-3 ${idx < detalleActual.items.length - 1 ? "border-b border-gray-50" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.producto_nombre}</p>
                            <p className="text-xs text-gray-400">{item.sku} · {item.unidad}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {item.precio_base && (
                              <p className="text-xs text-gray-400 line-through">${item.precio_base.toLocaleString("es-AR")}</p>
                            )}
                            <p className="text-sm font-semibold text-gray-900">${item.precio_fijo.toLocaleString("es-AR")}</p>
                            {ahorro !== null && ahorro > 0 && (
                              <p className="text-xs text-green-600 font-medium">−{ahorro}%</p>
                            )}
                            {ahorro !== null && ahorro < 0 && (
                              <p className="text-xs text-orange-600 font-medium">+{Math.abs(ahorro)}%</p>
                            )}
                          </div>
                          <button
                            onClick={() => eliminarItem(item.producto_id)}
                            disabled={eliminandoItem === item.producto_id}
                            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </main>

      {/* ── MODAL CREAR/EDITAR LISTA ── */}
      {modalLista && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-5">
              {editandoLista ? "Editar lista" : "Nueva lista de precios"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Minoristas frecuentes, Canal A..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descuento global (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formDescuento}
                  onChange={(e) => setFormDescuento(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Se aplica a todos los productos que no tengan precio fijo. 0 = sin descuento.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalLista(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardarLista}
                disabled={guardandoLista || !formNombre.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                {guardandoLista ? "Guardando..." : editandoLista ? "Guardar cambios" : "Crear lista"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR ITEM ── */}
      {modalItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-5">Agregar precio fijo</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <select
                  value={formProductoId}
                  onChange={(e) => setFormProductoId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="">— Seleccioná un producto —</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.sku ? `(${p.sku})` : ""}
                      {p.precio ? ` — $${p.precio.toLocaleString("es-AR")}` : ""}
                    </option>
                  ))}
                </select>
                {productos.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Todos los productos ya están en esta lista.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio fijo</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formPrecioFijo}
                  onChange={(e) => setFormPrecioFijo(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {ahorroPct !== null && (
                  <p className={`text-xs mt-1 font-medium ${ahorroPct > 0 ? "text-green-600" : ahorroPct < 0 ? "text-orange-600" : "text-gray-400"}`}>
                    {ahorroPct > 0 ? `−${ahorroPct}% vs precio base` : ahorroPct < 0 ? `+${Math.abs(ahorroPct)}% sobre precio base` : "Mismo precio base"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalItem(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardarItem}
                disabled={guardandoItem || !formProductoId || !formPrecioFijo}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                {guardandoItem ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
