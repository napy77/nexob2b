"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const ESTADO_LABEL: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pendiente:  { label: "Pendiente",  color: "#92400e", bg: "#fef3c7", emoji: "⏳" },
  confirmado: { label: "Confirmado", color: "#1e40af", bg: "#dbeafe", emoji: "✅" },
  enviado:    { label: "En camino",  color: "#5b21b6", bg: "#ede9fe", emoji: "🚚" },
  entregado:  { label: "Entregado",  color: "#065f46", bg: "#d1fae5", emoji: "📦" },
  cancelado:  { label: "Cancelado",  color: "#991b1b", bg: "#fee2e2", emoji: "✖️" },
}

type OrdenItem = {
  id: string
  nombre: string
  cantidad: number
  unidad: string
  precio_unitario: number
  alicuota_iva: number
  subtotal_neto: number
  subtotal_iva: number
  subtotal: number
}

type Orden = {
  id: string
  numero: string
  mayorista_id: string
  estado: string
  notas?: string
  total_neto: number
  total_iva: number
  total: number
  created_at: string
  items: OrdenItem[]
}

export default function PedidoDetallePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const esNuevo = searchParams.get("nuevo") === "1"

  const [orden, setOrden] = useState<Orden | null>(null)
  const [mayoristaNombre, setMayoristaNombre] = useState("")
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(false)
  const [error, setError] = useState("")

  const cargar = async () => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }

    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${params.id}`, {
        headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrden(data.orden)

      const mr = await fetch(`${BACKEND_URL}/store/mayoristas/${data.orden.mayorista_id}`)
      const md = await mr.json()
      setMayoristaNombre(md.mayorista?.nombre || "")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [params.id])

  const accion = async (endpoint: string) => {
    const token = localStorage.getItem("comercio_token")!
    setAccionando(true)
    setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${params.id}/${endpoint}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAccionando(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando pedido...</p>
    </div>
  )

  if (!orden) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error || "Pedido no encontrado"}</p>
    </div>
  )

  const estado = ESTADO_LABEL[orden.estado] || { label: orden.estado, color: "#374151", bg: "#f3f4f6", emoji: "📋" }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/comercio/pedidos")} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-gray-900">{orden.numero}</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {esNuevo && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-4 text-sm font-medium">
            ✅ ¡Pedido enviado! El mayorista lo recibirá pronto.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Estado */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{estado.emoji}</span>
            <div>
              <p className="text-xs text-gray-400">Estado del pedido</p>
              <span className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ color: estado.color, background: estado.bg }}>
                {estado.label}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>Mayorista: <span className="font-medium text-gray-700">{mayoristaNombre}</span></p>
            <p>Fecha: {new Date(orden.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            {orden.notas && <p>Notas: <span className="italic">{orden.notas}</span></p>}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Productos</h3>
          <div className="space-y-3">
            {orden.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.nombre}</p>
                  <p className="text-xs text-gray-400">{item.cantidad} {item.unidad} × ${item.precio_unitario.toLocaleString("es-AR")} neto + IVA {item.alicuota_iva}%</p>
                </div>
                <span className="font-semibold text-gray-900 flex-shrink-0 ml-4">
                  ${item.subtotal.toLocaleString("es-AR")}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal neto</span><span>${orden.total_neto.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>IVA</span><span>${orden.total_iva.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span><span>${orden.total.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>

        {/* Acciones del comercio */}
        <div className="space-y-2">
          {orden.estado === "enviado" && (
            <button onClick={() => accion("entregar")} disabled={accionando}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 text-sm">
              {accionando ? "Procesando..." : "✅ Confirmar recepción"}
            </button>
          )}
          {orden.estado === "pendiente" && (
            <button onClick={() => { if (confirm("¿Cancelar este pedido?")) accion("cancelar") }}
              disabled={accionando}
              className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-semibold hover:bg-red-100 transition-colors disabled:opacity-60 text-sm">
              {accionando ? "Procesando..." : "Cancelar pedido"}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
