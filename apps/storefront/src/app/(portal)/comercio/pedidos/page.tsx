"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"

const ESTADO_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: "Pendiente",  color: "#92400e", bg: "#fef3c7" },
  confirmado: { label: "Confirmado", color: "#1e40af", bg: "#dbeafe" },
  enviado:    { label: "Enviado",    color: "#5b21b6", bg: "#ede9fe" },
  entregado:  { label: "Entregado",  color: "#065f46", bg: "#d1fae5" },
  cancelado:  { label: "Cancelado",  color: "#991b1b", bg: "#fee2e2" },
}

type Orden = {
  id: string
  numero: string
  mayorista_id: string
  estado: string
  total: number
  total_neto: number
  total_iva: number
  created_at: string
  items: { nombre: string; cantidad: number; unidad: string }[]
}

export default function PedidosComercioPage() {
  const router = useRouter()
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mayoristasMap, setMayoristasMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }

    fetch(`${BACKEND_URL}/store/ordenes`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(async (data) => {
        setOrdenes(data.ordenes || [])

        // Cargar nombres de mayoristas
        const ids = [...new Set((data.ordenes || []).map((o: Orden) => o.mayorista_id))] as string[]
        const map: Record<string, string> = {}
        await Promise.all(ids.map(async (id) => {
          try {
            const r = await fetch(`${BACKEND_URL}/store/mayoristas/${id}`)
            const d = await r.json()
            map[id] = d.mayorista?.nombre || id
          } catch {}
        }))
        setMayoristasMap(map)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando pedidos...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/comercio/dashboard")} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-gray-900">Mis pedidos</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>
        )}

        {ordenes.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">📋</span>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Todavía no hiciste pedidos</h2>
            <p className="text-sm text-gray-400 mb-6">Explorá el catálogo y agregá productos al carrito.</p>
            <button onClick={() => router.push("/comercio/catalogo")}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              Ir al catálogo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {ordenes.map((o) => {
              const estado = ESTADO_LABEL[o.estado] || { label: o.estado, color: "#374151", bg: "#f3f4f6" }
              return (
                <button key={o.id} onClick={() => router.push(`/comercio/pedidos/${o.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">{o.numero}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: estado.color, background: estado.bg }}>
                        {estado.label}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900">${o.total.toLocaleString("es-AR")}</span>
                  </div>
                  <p className="text-xs text-blue-600 font-medium mb-1">
                    {mayoristasMap[o.mayorista_id] || "Mayorista"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {o.items.slice(0, 2).map((i) => `${i.cantidad} ${i.unidad} ${i.nombre}`).join(" · ")}
                    {o.items.length > 2 && ` · +${o.items.length - 2} más`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(o.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
