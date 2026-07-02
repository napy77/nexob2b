"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const ESTADO_INFO: Record<string, { label: string; color: string; bg: string; emoji: string; descripcion: string }> = {
  pendiente:      { label: "Pendiente",       color: "#92400e", bg: "#fef3c7", emoji: "⏳", descripcion: "El envío fue registrado y está esperando ser recogido." },
  en_camino:      { label: "En camino",        color: "#1e3a8a", bg: "#dbeafe", emoji: "🚚", descripcion: "El paquete está en tránsito hacia el destinatario." },
  visita_fallida: { label: "Visita fallida",   color: "#92400e", bg: "#ffedd5", emoji: "🔔", descripcion: "Se intentó la entrega pero no hubo respuesta." },
  entregado:      { label: "Entregado",        color: "#064e3b", bg: "#d1fae5", emoji: "✅", descripcion: "El paquete fue entregado exitosamente." },
  rechazado:      { label: "Rechazado",        color: "#991b1b", bg: "#fee2e2", emoji: "❌", descripcion: "La entrega fue rechazada por el destinatario." },
}

type Evento = { timestamp: string; estado: string; notas: string | null }
type Envio = {
  id: string
  orden_numero: string | null
  transporte_nombre: string | null
  numero_guia: string | null
  tiene_seguimiento_propio: boolean
  tracking_url: string | null
  estado: string
  eventos: Evento[]
  destinatario_nombre: string | null
  destinatario_direccion: string | null
  cantidad_bultos: number | null
  peso_kg: number | null
  dimensiones: string | null
  created_at: string
}

const ESTADOS_ACCION = [
  { value: "en_camino",      label: "En camino",      emoji: "🚚", desc: "El paquete está siendo trasladado" },
  { value: "visita_fallida", label: "Visita fallida",  emoji: "🔔", desc: "No hubo respuesta en el domicilio" },
  { value: "entregado",      label: "Entregado",       emoji: "✅", desc: "Entregué el paquete al destinatario" },
  { value: "rechazado",      label: "Rechazado",       emoji: "❌", desc: "El destinatario rechazó el paquete" },
]

export default function SeguimientoPage() {
  const params = useParams()
  const [envio, setEnvio] = useState<Envio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("")
  const [notas, setNotas] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [modoTransportista, setModoTransportista] = useState(false)

  const cargar = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/store/seguimiento/${params.token}`, {
        headers: { "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No encontrado")
      setEnvio(data.envio)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [params.token])

  const actualizarEstado = async () => {
    if (!estadoSeleccionado) return
    setGuardando(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/seguimiento/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PUB_KEY },
        body: JSON.stringify({ estado: estadoSeleccionado, notas: notas.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGuardadoOk(true)
      setEstadoSeleccionado("")
      setNotas("")
      setModoTransportista(false)
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Buscando información del envío...</p>
      </div>
    </div>
  )

  if (error || !envio) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <span className="text-6xl block mb-4">📦</span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Envío no encontrado</h2>
        <p className="text-gray-500 text-sm">{error || "El código QR no corresponde a ningún envío activo."}</p>
      </div>
    </div>
  )

  const estadoInfo = ESTADO_INFO[envio.estado] || { label: envio.estado, color: "#374151", bg: "#f3f4f6", emoji: "📋", descripcion: "" }
  const cerrado = ["entregado", "rechazado"].includes(envio.estado)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-700 text-lg">Nexo B2B</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">Seguimiento de envío</span>
          </div>
          {!cerrado && !modoTransportista && (
            <button onClick={() => setModoTransportista(true)}
              className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
              Soy el transportista
            </button>
          )}
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 py-8 space-y-4">

        {/* Estado actual */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-3">{estadoInfo.emoji}</span>
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-2"
            style={{ color: estadoInfo.color, background: estadoInfo.bg }}>
            {estadoInfo.label}
          </span>
          {estadoInfo.descripcion && (
            <p className="text-sm text-gray-500 mt-1">{estadoInfo.descripcion}</p>
          )}
          {envio.orden_numero && (
            <p className="text-xs text-gray-400 mt-3">Orden {envio.orden_numero}</p>
          )}
        </div>

        {/* Confirmación de actualización */}
        {guardadoOk && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 font-medium text-center">
            ✅ Estado actualizado correctamente
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Info del envío */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">📋 Datos del envío</h3>
          <div className="space-y-2 text-sm">
            {envio.transporte_nombre && (
              <div className="flex justify-between">
                <span className="text-gray-500">Transporte</span>
                <span className="font-medium text-gray-900">{envio.transporte_nombre}</span>
              </div>
            )}
            {envio.numero_guia && (
              <div className="flex justify-between">
                <span className="text-gray-500">Nº de guía</span>
                <span className="font-mono font-semibold text-gray-900">{envio.numero_guia}</span>
              </div>
            )}
            {envio.destinatario_nombre && (
              <div className="flex justify-between">
                <span className="text-gray-500">Destinatario</span>
                <span className="font-medium text-gray-900">{envio.destinatario_nombre}</span>
              </div>
            )}
            {envio.destinatario_direccion && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 flex-shrink-0">Dirección</span>
                <span className="text-gray-700 text-right">{envio.destinatario_direccion}</span>
              </div>
            )}
            {envio.cantidad_bultos && (
              <div className="flex justify-between">
                <span className="text-gray-500">Bultos</span>
                <span className="text-gray-700">
                  {envio.cantidad_bultos} bulto{envio.cantidad_bultos !== 1 ? "s" : ""}
                  {envio.peso_kg ? ` · ${envio.peso_kg} kg` : ""}
                  {envio.dimensiones ? ` · ${envio.dimensiones}` : ""}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha de despacho</span>
              <span className="text-gray-700">{new Date(envio.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
          </div>

          {/* Link a seguimiento externo si aplica */}
          {envio.tiene_seguimiento_propio && envio.tracking_url && (
            <a href={envio.tracking_url} target="_blank" rel="noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              🔗 Ver seguimiento en {envio.transporte_nombre || "el transportista"}
            </a>
          )}
        </div>

        {/* Historial de eventos */}
        {envio.eventos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">📍 Historial</h3>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-100" />
              <div className="space-y-4">
                {[...envio.eventos].reverse().map((ev, i) => {
                  const info = ESTADO_INFO[ev.estado]
                  return (
                    <div key={i} className="flex gap-4 pl-8 relative">
                      <div className="absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-sm"
                        style={{ background: info?.bg || "#f3f4f6" }}>
                        {info?.emoji || "📋"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900" style={{ color: info?.color }}>
                          {info?.label || ev.estado}
                        </p>
                        {ev.notas && <p className="text-xs text-gray-500 mt-0.5 italic">"{ev.notas}"</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(ev.timestamp).toLocaleString("es-AR", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Panel del transportista (sin seguimiento propio + no cerrado) */}
        {!envio.tiene_seguimiento_propio && !cerrado && modoTransportista && (
          <div className="bg-white rounded-2xl border border-blue-200 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">🚚 Actualizar estado</h3>
            <p className="text-xs text-gray-500 mb-4">Seleccioná el estado actual del envío.</p>

            <div className="space-y-2 mb-4">
              {ESTADOS_ACCION.map(a => (
                <button key={a.value} onClick={() => setEstadoSeleccionado(a.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    estadoSeleccionado === a.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <span className="text-2xl flex-shrink-0">{a.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                    <p className="text-xs text-gray-500">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
              <textarea rows={2} placeholder="Ej: Timbre sin respuesta, dejé aviso en buzón."
                value={notas} onChange={e => setNotas(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setModoTransportista(false); setEstadoSeleccionado(""); setNotas("") }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={actualizarEstado} disabled={!estadoSeleccionado || guardando}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {guardando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}

        {cerrado && (
          <div className="text-center py-4">
            <p className="text-xs text-gray-400">Este envío está cerrado. No se pueden registrar más actualizaciones.</p>
          </div>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-gray-300">Nexo B2B · Plataforma de comercio mayorista</p>
        </div>
      </main>
    </div>
  )
}
