"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const token = () => (typeof localStorage !== "undefined" ? localStorage.getItem("comercio_token") || "" : "")
const authHeaders = () => ({ "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY, "Content-Type": "application/json" })

type PresentacionMayorista = {
  id: string; presentacion_id: string; nombre: string; factor: number
  ean_propio: string | null; peso_g: number | null; orden: number
  precio: number; precio_lista: number | null; stock: number
}
type MayoristaOpcion = {
  listing_id: string; mayorista_id: string; mayorista_nombre: string
  mayorista_logo: string | null; tiempo_entrega_dias: number | null
  tiene_alta: boolean | null; presentaciones: PresentacionMayorista[]
}
type Producto = {
  id: string; ean: string; nombre: string; descripcion: string | null
  marca: string | null; unidad_base: string; alicuota_iva: number
  imagen_url: string | null
  pasillo_nombre: string | null; rubro_nombre: string | null
  mayoristas: MayoristaOpcion[]
}

type CarritoItem = {
  mayorista_id: string; mayorista_nombre: string; listing_id: string
  presentacion_id: string; mp_presentacion_id: string
  nombre: string; precio: number; alicuota_iva: number; cantidad: number; unidad: string
}

export default function ProductosComercioPage() {
  const router = useRouter()
  const [comercio, setComercio] = useState<{ id: string; nombre: string } | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [error, setError] = useState("")

  // Carrito
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [showCarrito, setShowCarrito] = useState(false)
  const [creandoOrden, setCreandoOrden] = useState(false)

  // Producto expandido
  const [expandido, setExpandido] = useState<string | null>(null)

  const cargarComercio = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/store/comercios/me`, { headers: authHeaders() })
      if (res.ok) { const d = await res.json(); setComercio(d.comercio) }
    } catch {}
  }

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (comercio?.id) params.set("comercio_id", comercio.id)
      const res = await fetch(`${BACKEND_URL}/store/productos?${params}`, {
        headers: { "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      setProductos(data.productos || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [q, comercio?.id])

  useEffect(() => { cargarComercio() }, [])
  useEffect(() => { cargarProductos() }, [cargarProductos])

  const agregarAlCarrito = (
    producto: Producto,
    mayorista: MayoristaOpcion,
    pres: PresentacionMayorista,
    cantidad: number
  ) => {
    const key = `${mayorista.mayorista_id}|${pres.id}`
    setCarrito(c => {
      const exists = c.findIndex(i => `${i.mayorista_id}|${i.mp_presentacion_id}` === key)
      if (exists >= 0) {
        const updated = [...c]
        updated[exists] = { ...updated[exists], cantidad: updated[exists].cantidad + cantidad }
        return updated
      }
      return [...c, {
        mayorista_id: mayorista.mayorista_id,
        mayorista_nombre: mayorista.mayorista_nombre,
        listing_id: mayorista.listing_id,
        presentacion_id: pres.presentacion_id,
        mp_presentacion_id: pres.id,
        nombre: `${producto.nombre} — ${pres.nombre}`,
        precio: pres.precio,
        alicuota_iva: producto.alicuota_iva,
        cantidad,
        unidad: pres.nombre,
      }]
    })
  }

  const crearOrden = async () => {
    if (!carrito.length) return
    // Agrupar por mayorista
    const porMayorista: Record<string, CarritoItem[]> = {}
    carrito.forEach(i => {
      if (!porMayorista[i.mayorista_id]) porMayorista[i.mayorista_id] = []
      porMayorista[i.mayorista_id].push(i)
    })

    if (Object.keys(porMayorista).length > 1) {
      alert("Por ahora solo podés hacer un pedido a un mayorista a la vez. Separá los productos por mayorista.")
      return
    }

    const [mayorista_id, items] = Object.entries(porMayorista)[0]
    setCreandoOrden(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          mayorista_id,
          items: items.map(i => ({ presentacion_id: i.mp_presentacion_id, cantidad: i.cantidad })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCarrito([])
      setShowCarrito(false)
      router.push(`/comercio/pedidos/${data.orden.id}`)
    } catch (e: any) { setError(e.message) }
    finally { setCreandoOrden(false) }
  }

  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)
  const totalCarrito = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const cantidadCarrito = carrito.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de productos</h1>
          {cantidadCarrito > 0 && (
            <button onClick={() => setShowCarrito(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
              🛒 <span>{cantidadCarrito} items · {fmt(totalCarrito)}</span>
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

        {/* Búsqueda */}
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, EAN, marca..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400" />

        {/* Productos */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando catálogo...</div>
        ) : productos.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-3">🔍</span>
            <p className="text-gray-500 text-sm">No hay productos disponibles.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {productos.map(prod => {
              const isOpen = expandido === prod.id
              const mejorPrecio = prod.mayoristas.flatMap(m => m.presentaciones).reduce<number | null>(
                (min, p) => min === null ? p.precio : Math.min(min, p.precio), null
              )
              const mayoristasConAlta = prod.mayoristas.filter(m => m.tiene_alta === true).length
              const totalMayoristas = prod.mayoristas.length

              return (
                <div key={prod.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Cabecera del producto */}
                  <button onClick={() => setExpandido(isOpen ? null : prod.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
                      {prod.imagen_url
                        ? <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover" />
                        : <span>📦</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{prod.nombre}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {prod.marca && `${prod.marca} · `}EAN: {prod.ean}
                        {prod.pasillo_nombre && ` · ${prod.pasillo_nombre}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {mejorPrecio && (
                        <p className="text-sm font-bold text-gray-900">desde {fmt(mejorPrecio)}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {totalMayoristas} mayorista{totalMayoristas !== 1 ? "s" : ""}
                        {mayoristasConAlta > 0 && ` · ${mayoristasConAlta} con alta`}
                      </p>
                    </div>
                    <span className="text-gray-300 ml-2">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {/* Opciones de mayoristas (expandido) */}
                  {isOpen && (
                    <div className="border-t border-gray-100">
                      {prod.mayoristas.map(m => (
                        <div key={m.listing_id} className="border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-3 px-5 py-3 bg-gray-50">
                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                              {m.mayorista_nombre[0]}
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{m.mayorista_nombre}</span>
                            {m.tiene_alta === true && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Alta</span>
                            )}
                            {m.tiene_alta === false && (
                              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Sin alta</span>
                            )}
                            {m.tiempo_entrega_dias && (
                              <span className="text-xs text-gray-400">🚚 {m.tiempo_entrega_dias}d</span>
                            )}
                          </div>

                          {/* Presentaciones */}
                          <div className="divide-y divide-gray-50">
                            {(m.presentaciones || []).map(p => (
                              <PresentacionRow
                                key={p.id}
                                prod={prod} mayorista={m} pres={p}
                                onAgregar={(cant) => agregarAlCarrito(prod, m, p, cant)}
                                carritoQty={carrito.find(c => c.mp_presentacion_id === p.id)?.cantidad || 0}
                                fmt={fmt}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal carrito */}
      {showCarrito && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">🛒 Mi pedido</h2>
              <button onClick={() => setShowCarrito(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-3">
              {/* Avisar si hay múltiples mayoristas */}
              {new Set(carrito.map(i => i.mayorista_id)).size > 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                  ⚠️ Tenés productos de múltiples mayoristas. Por ahora se procesa un pedido por mayorista.
                </div>
              )}

              {carrito.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-500">{item.mayorista_nombre} · {fmt(item.precio)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => setCarrito(c => c.map((i, j) => j === idx ? { ...i, cantidad: Math.max(1, i.cantidad - 1) } : i))}
                      className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 font-bold hover:bg-gray-300 text-sm">−</button>
                    <span className="text-sm font-semibold w-6 text-center">{item.cantidad}</span>
                    <button onClick={() => setCarrito(c => c.map((i, j) => j === idx ? { ...i, cantidad: i.cantidad + 1 } : i))}
                      className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 font-bold hover:bg-gray-300 text-sm">+</button>
                    <button onClick={() => setCarrito(c => c.filter((_, j) => j !== idx))}
                      className="ml-1 text-gray-300 hover:text-red-400 text-lg">✕</button>
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between text-sm font-bold text-gray-900 mb-4">
                  <span>Total estimado</span>
                  <span>{fmt(totalCarrito)}</span>
                </div>
                <button onClick={crearOrden} disabled={creandoOrden || carrito.length === 0}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60">
                  {creandoOrden ? "Procesando..." : "Confirmar pedido"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PresentacionRow({ prod, mayorista, pres, onAgregar, carritoQty, fmt }: {
  prod: Producto; mayorista: MayoristaOpcion; pres: PresentacionMayorista
  onAgregar: (cantidad: number) => void; carritoQty: number; fmt: (n: number) => string
}) {
  const [cantidad, setCantidad] = useState(1)

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{pres.nombre}</p>
        <p className="text-xs text-gray-400">
          ×{pres.factor} {prod.unidad_base}
          {pres.ean_propio && ` · ${pres.ean_propio}`}
          {pres.peso_g && ` · ${pres.peso_g}g`}
        </p>
        {pres.precio_lista && (
          <p className="text-xs text-gray-400 line-through">{fmt(pres.precio_lista)}</p>
        )}
        <p className="text-base font-bold text-gray-900">{fmt(pres.precio)}</p>
        {pres.stock < 10 && pres.stock > 0 && (
          <p className="text-xs text-amber-600">⚠️ Últimas {pres.stock} unidades</p>
        )}
        {pres.stock === 0 && (
          <p className="text-xs text-red-500">Sin stock</p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4">
        {carritoQty > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{carritoQty} en carrito</span>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 text-sm">−</button>
          <span className="text-sm w-6 text-center font-semibold">{cantidad}</span>
          <button onClick={() => setCantidad(c => c + 1)}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 text-sm">+</button>
        </div>
        <button onClick={() => onAgregar(cantidad)} disabled={pres.stock === 0}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-40">
          Agregar
        </button>
      </div>
    </div>
  )
}
