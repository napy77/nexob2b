"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "../../../../lib/comercio/cart"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const authHeaders = () => ({
  "Authorization": `Bearer ${typeof localStorage !== "undefined" ? localStorage.getItem("comercio_token") || "" : ""}`,
  "x-publishable-api-key": PUB_KEY,
  "Content-Type": "application/json",
})

type PresentacionMayorista = {
  id: string           // producto_mayorista_presentacion.id → va como presentacion_id al orden
  presentacion_id: string
  nombre: string
  factor: number
  ean_propio: string | null
  peso_g: number | null
  orden: number
  precio: number
  precio_lista: number | null
  stock: number
}

type MayoristaOpcion = {
  listing_id: string
  mayorista_id: string
  mayorista_nombre: string
  mayorista_logo: string | null
  tiempo_entrega_dias: number | null
  tiene_alta: boolean | null
  presentaciones: PresentacionMayorista[]
}

type Producto = {
  id: string
  ean: string
  nombre: string
  descripcion: string | null
  marca: string | null
  unidad_base: string
  alicuota_iva: number
  imagen_url: string | null
  pasillo_nombre: string | null
  rubro_nombre: string | null
  mayoristas: MayoristaOpcion[]
}

export default function ProductosComercioPage() {
  const router = useRouter()
  const { addItem, carts } = useCart()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [error, setError] = useState("")
  const [expandido, setExpandido] = useState<string | null>(null)

  const cargarProductos = useCallback(async () => {
    setLoading(true)
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("comercio_token") : null
      if (!token) { router.replace("/comercio/login"); return }

      // Obtener comercio_id para filtrar por zona
      let comercio_id: string | null = null
      try {
        const me = await fetch(`${BACKEND_URL}/store/comercios/me`, { headers: authHeaders() })
        if (me.ok) { const d = await me.json(); comercio_id = d.comercio?.id }
      } catch {}

      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (comercio_id) params.set("comercio_id", comercio_id)

      const res = await fetch(`${BACKEND_URL}/store/productos?${params}`, {
        headers: { "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      setProductos(data.productos || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [q, router])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/comercio/dashboard")} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo unificado</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
        )}

        {/* Búsqueda */}
        <div className="relative mb-6">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre, EAN, marca..."
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

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
              const mejorPrecio = prod.mayoristas
                .flatMap(m => m.presentaciones)
                .reduce<number | null>((min, p) => min === null ? p.precio : Math.min(min, p.precio), null)
              const mayoristasConAlta = prod.mayoristas.filter(m => m.tiene_alta === true).length
              const totalMayoristas = prod.mayoristas.length

              return (
                <div key={prod.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Cabecera del producto */}
                  <button
                    onClick={() => setExpandido(isOpen ? null : prod.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
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
                      {prod.descripcion && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{prod.descripcion}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {mejorPrecio != null && (
                        <p className="text-sm font-bold text-gray-900">desde {fmt(mejorPrecio)}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {totalMayoristas} mayorista{totalMayoristas !== 1 ? "s" : ""}
                        {mayoristasConAlta > 0 && ` · ${mayoristasConAlta} con alta`}
                      </p>
                    </div>
                    <span className="text-gray-300 ml-2 text-xs">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {/* Opciones de mayoristas (expandido) */}
                  {isOpen && (
                    <div className="border-t border-gray-100">
                      {prod.mayoristas.map(m => {
                        const carritoMayorista = carts[m.mayorista_id] || []
                        return (
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
                              {m.tiempo_entrega_dias != null && (
                                <span className="text-xs text-gray-400">🚚 {m.tiempo_entrega_dias}d</span>
                              )}
                            </div>

                            <div className="divide-y divide-gray-50">
                              {(m.presentaciones || []).map(pres => {
                                const enCarrito = carritoMayorista.find(c => c.producto_id === pres.id)?.cantidad || 0
                                return (
                                  <PresentacionRow
                                    key={pres.id}
                                    prod={prod}
                                    mayorista={m}
                                    pres={pres}
                                    enCarrito={enCarrito}
                                    fmt={fmt}
                                    onAgregar={(cantidad) => addItem({
                                      producto_id: pres.id,          // mp_presentacion_id como clave única
                                      presentacion_id: pres.id,      // para el orden nuevo
                                      nombre: `${prod.nombre} — ${pres.nombre}`,
                                      ean: prod.ean || null,
                                      precio_unitario: pres.precio,
                                      alicuota_iva: prod.alicuota_iva,
                                      cantidad,
                                      unidad: pres.nombre,
                                      imagen_url: prod.imagen_url || undefined,
                                      mayorista_id: m.mayorista_id,
                                      mayorista_nombre: m.mayorista_nombre,
                                    })}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PresentacionRow({ prod, mayorista, pres, enCarrito, fmt, onAgregar }: {
  prod: Producto
  mayorista: MayoristaOpcion
  pres: PresentacionMayorista
  enCarrito: number
  fmt: (n: number) => string
  onAgregar: (cantidad: number) => void
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
        {pres.precio_lista != null && (
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
        {enCarrito > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {enCarrito} en carrito
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCantidad(c => Math.max(1, c - 1))}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 text-sm"
          >−</button>
          <span className="text-sm w-6 text-center font-semibold">{cantidad}</span>
          <button
            onClick={() => setCantidad(c => c + 1)}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 text-sm"
          >+</button>
        </div>
        <button
          onClick={() => onAgregar(cantidad)}
          disabled={pres.stock === 0}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Agregar
        </button>
      </div>
    </div>
  )
}
