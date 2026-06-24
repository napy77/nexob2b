"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const ESTADO_LABEL: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pendiente:  { label: "Pendiente",  color: "#92400e", bg: "#fef3c7", emoji: "⏳" },
  confirmado: { label: "Confirmado", color: "#1e40af", bg: "#dbeafe", emoji: "✅" },
  enviado:    { label: "Enviado",    color: "#5b21b6", bg: "#ede9fe", emoji: "🚚" },
  entregado:  { label: "Entregado",  color: "#065f46", bg: "#d1fae5", emoji: "📦" },
  cancelado:  { label: "Cancelado",  color: "#991b1b", bg: "#fee2e2", emoji: "✖️" },
}

// Qué puede hacer el mayorista desde cada estado
const ACCIONES: Record<string, { label: string; siguiente: string; color: string }[]> = {
  pendiente:  [
    { label: "✅ Confirmar pedido",  siguiente: "confirmado", color: "bg-blue-600 text-white hover:bg-blue-700" },
    { label: "✖ Rechazar pedido",    siguiente: "cancelado",  color: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" },
  ],
  confirmado: [
    { label: "🚚 Marcar como enviado", siguiente: "enviado", color: "bg-purple-600 text-white hover:bg-purple-700" },
    { label: "✖ Cancelar pedido",      siguiente: "cancelado", color: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" },
  ],
  enviado:    [],
  entregado:  [],
  cancelado:  [],
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
  comercio_id: string
  estado: string
  notas?: string
  total_neto: number
  total_iva: number
  total: number
  created_at: string
  items: OrdenItem[]
  comercio?: {
    nombre: string
    email: string
    telefono?: string
    cuit?: string
    condicion_fiscal?: string
  }
}

export default function PedidoDetalleMayoristaPage() {
  const router = useRouter()
  const params = useParams()
  const [orden, setOrden] = useState<Orden | null>(null)
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(false)
  const [error, setError] = useState("")

  const cargar = async () => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}`, {
        headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrden(data.orden)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [params.id])

  const cambiarEstado = async (siguiente: string) => {
    const token = localStorage.getItem("mayorista_token")!
    setAccionando(true)
    setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
        body: JSON.stringify({ estado: siguiente }),
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
  const acciones = ACCIONES[orden.estado] || []

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/mayorista/pedidos")} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-gray-900">{orden.numero}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
            style={{ color: estado.color, background: estado.bg }}>
            {estado.emoji} {estado.label}
          </span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Acciones */}
        {acciones.length > 0 && (
          <div className="space-y-2">
            {acciones.map((a) => (
              <button key={a.siguiente}
                onClick={() => {
                  if (a.siguiente === "cancelado" && !confirm("¿Rechazar este pedido?")) return
                  cambiarEstado(a.siguiente)
                }}
                disabled={accionando}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${a.color}`}>
                {accionando ? "Procesando..." : a.label}
              </button>
            ))}
          </div>
        )}

        {/* Info del comercio */}
        {orden.comercio && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Comercio</h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{orden.comercio.nombre}</p>
              {orden.comercio.condicion_fiscal && (
                <p className="text-xs text-gray-500">{orden.comercio.condicion_fiscal}</p>
              )}
              {orden.comercio.cuit && (
                <p className="text-xs text-gray-500">CUIT: {orden.comercio.cuit}</p>
              )}
              {orden.comercio.email && (
                <a href={`mailto:${orden.comercio.email}`} className="text-xs text-blue-600 block">{orden.comercio.email}</a>
              )}
              {orden.comercio.telefono && (
                <a href={`tel:${orden.comercio.telefono}`} className="text-xs text-blue-600 block">{orden.comercio.telefono}</a>
              )}
            </div>
          </div>
        )}

        {/* Detalle del pedido */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Productos solicitados</h3>
            <span className="text-xs text-gray-400">
              {new Date(orden.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="space-y-3">
            {orden.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {item.cantidad} {item.unidad} × ${item.precio_unitario.toLocaleString("es-AR")} neto + IVA {item.alicuota_iva}%
                  </p>
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

          {orden.notas && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-amber-800 mb-1">Notas del comercio:</p>
              <p className="text-xs text-amber-700 italic">{orden.notas}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
