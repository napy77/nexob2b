"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export const ESTADO_LABEL: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  cargada:       { label: "Cargada",       color: "#92400e", bg: "#fef3c7", emoji: "📥" },
  confirmado:    { label: "Confirmado",     color: "#1e40af", bg: "#dbeafe", emoji: "✅" },
  armando:       { label: "Armando",        color: "#6d28d9", bg: "#ede9fe", emoji: "📦" },
  listo:         { label: "Listo",          color: "#065f46", bg: "#d1fae5", emoji: "🟢" },
  en_transporte: { label: "En camino",      color: "#1e3a8a", bg: "#dbeafe", emoji: "🚚" },
  entregado:     { label: "Entregado",      color: "#064e3b", bg: "#d1fae5", emoji: "✔️" },
  cancelado:     { label: "Cancelado",      color: "#991b1b", bg: "#fee2e2", emoji: "✖️" },
  devuelto:      { label: "Devuelta",       color: "#92400e", bg: "#ffedd5", emoji: "↩️" },
  // legacy compat
  pendiente:     { label: "Cargada",        color: "#92400e", bg: "#fef3c7", emoji: "📥" },
  enviado:       { label: "En camino",      color: "#1e3a8a", bg: "#dbeafe", emoji: "🚚" },
}

const FILTROS = ["todos", "cargada", "confirmado", "armando", "listo", "en_transporte", "entregado", "cancelado", "devuelto"]

type Orden = {
  id: string
  numero: string
  comercio_id: string
  comercio_nombre?: string
  estado: string
  is_pagada?: boolean
  is_facturada?: boolean
  total: number
  created_at: string
  items: { nombre: string; cantidad: number; unidad: string }[]
}

export default function PedidosMayoristaPage() {
  const router = useRouter()
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filtro, setFiltro] = useState("todos")

  useEffect(() => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }

    fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes`, {
      headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
    })
      .then((r) => r.json())
      .then((data) => setOrdenes(data.ordenes || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  const normEstado = (o: Orden) => {
    if (o.estado === "pendiente") return "cargada"
    if (o.estado === "enviado") return "en_transporte"
    return o.estado
  }

  const filtradas = filtro === "todos"
    ? ordenes
    : ordenes.filter((o) => normEstado(o) === filtro)

  const cargadas = ordenes.filter((o) => ["cargada", "pendiente"].includes(o.estado)).length

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando pedidos...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-bold text-gray-900">Pedidos recibidos</span>
            {cargadas > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cargadas} nuevo{cargadas !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
        )}

        {/* Filtros de estado */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {FILTROS.map((f) => {
            const count = f === "todos" ? ordenes.length : ordenes.filter((o) => normEstado(o) === f).length
            const info = ESTADO_LABEL[f]
            return (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filtro === f ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}>
                {f === "todos" ? "Todos" : `${info?.emoji || ""} ${info?.label || f}`}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        {filtradas.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">📭</span>
            <p className="text-gray-500 text-sm">
              {filtro === "todos" ? "Todavía no recibiste pedidos." : `No hay pedidos en estado "${ESTADO_LABEL[filtro]?.label || filtro}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map((o) => {
              const est = normEstado(o)
              const estado = ESTADO_LABEL[est] || { label: est, color: "#374151", bg: "#f3f4f6", emoji: "📋" }
              return (
                <button key={o.id} onClick={() => router.push(`/mayorista/pedidos/${o.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{o.numero}</span>
                      {["cargada", "pendiente"].includes(o.estado) && (
                        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: estado.color, background: estado.bg }}>
                        {estado.emoji} {estado.label}
                      </span>
                      {o.is_facturada && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">🧾 Facturada</span>
                      )}
                      {o.is_pagada && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">💰 Pagada</span>
                      )}
                    </div>
                    <span className="font-bold text-gray-900">${o.total.toLocaleString("es-AR")}</span>
                  </div>
                  {o.comercio_nombre && (
                    <p className="text-xs text-blue-600 font-medium mb-0.5">{o.comercio_nombre}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {o.items.slice(0, 2).map((i) => `${i.cantidad} ${i.unidad} ${i.nombre}`).join(" · ")}
                    {o.items.length > 2 && ` · +${o.items.length - 2} más`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(o.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
