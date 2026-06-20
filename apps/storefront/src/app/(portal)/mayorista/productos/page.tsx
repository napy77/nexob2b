"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { productosApi } from "../../../../lib/mayorista/api"

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
  activo: boolean
}

export default function ProductosPage() {
  const router = useRouter()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const cargar = () => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }
    productosApi.listar(token)
      .then((data) => setProductos(data.productos))
      .catch(() => { localStorage.removeItem("mayorista_token"); router.replace("/mayorista/login") })
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminás "${nombre}"? Esta acción no se puede deshacer.`)) return
    setEliminando(id)
    try {
      const token = localStorage.getItem("mayorista_token")!
      await productosApi.eliminar(token, id)
      setProductos((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setEliminando(null)
    }
  }

  // Agrupar por pasillo
  const pasillos = productos.reduce((acc, p) => {
    const key = p.pasillo || "Sin pasillo"
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Mis productos</span>
          </div>
          <button
            onClick={() => router.push("/mayorista/productos/nuevo")}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo producto
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis productos</h1>
            <p className="text-sm text-gray-500 mt-1">
              {productos.length === 0
                ? "Todavía no tenés productos cargados"
                : `${productos.length} producto${productos.length !== 1 ? "s" : ""} en catálogo`}
            </p>
          </div>
        </div>

        {productos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Tu catálogo está vacío</h3>
            <p className="text-sm text-gray-500 mb-6">Empezá agregando tus productos para que los minoristas puedan verlos.</p>
            <button
              onClick={() => router.push("/mayorista/productos/nuevo")}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Agregar primer producto
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(pasillos).map(([pasillo, items]) => (
              <div key={pasillo}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{pasillo}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((p) => (
                    <div key={p.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${p.activo ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
                      {p.imagen_url ? (
                        <div className="aspect-video bg-gray-50 overflow-hidden">
                          <img
                            src={`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}${p.imagen_url}`}
                            alt={p.nombre}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-50 flex items-center justify-center">
                          <span className="text-3xl">📦</span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 leading-tight">{p.nombre}</h3>
                          {!p.activo && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full flex-shrink-0">Inactivo</span>
                          )}
                        </div>
                        {p.descripcion && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{p.descripcion}</p>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg font-bold text-gray-900">
                            ${p.precio.toLocaleString("es-AR")}
                          </span>
                          <span className="text-xs text-gray-400">/ {p.unidad}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                          <span>Mín: {p.compra_minima} {p.unidad}{p.compra_minima !== 1 ? "s" : ""}</span>
                          {p.stock !== null && p.stock !== undefined && (
                            <span>Stock: {p.stock}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/mayorista/productos/${p.id}`)}
                            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(p.id, p.nombre)}
                            disabled={eliminando === p.id}
                            className="px-3 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
