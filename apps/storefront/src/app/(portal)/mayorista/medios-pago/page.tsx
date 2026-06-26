"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const TIPO_LABEL: Record<string, string> = {
  efectivo:      "Efectivo",
  cheque:        "Cheque / eCheq",
  transferencia: "Transferencia",
  tarjeta:       "Tarjeta",
  online:        "Online / Plataforma",
}

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  efectivo:      { bg: "#d1fae5", color: "#065f46" },
  cheque:        { bg: "#dbeafe", color: "#1e40af" },
  transferencia: { bg: "#ede9fe", color: "#5b21b6" },
  tarjeta:       { bg: "#fce7f3", color: "#9d174d" },
  online:        { bg: "#fef3c7", color: "#92400e" },
}

type MedioPago = {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  icono: string | null
  habilitado: boolean
  orden: number
  integracion: string | null
}

export default function MediosPagoMayoristaPage() {
  const router = useRouter()
  const [medios, setMedios] = useState<MedioPago[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [guardado, setGuardado] = useState(false)

  const headers = () => {
    const token = localStorage.getItem("mayorista_token") || ""
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-publishable-api-key": PUB_KEY,
    }
  }

  const cargar = async () => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/medios-pago`, { headers: headers() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMedios(data.medios_pago || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const toggle = async (m: MedioPago) => {
    setToggling(m.id)
    setGuardado(false)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/medios-pago`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ medio_pago_id: m.id, habilitado: !m.habilitado }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setMedios(prev => prev.map(x => x.id === m.id ? { ...x, habilitado: !x.habilitado } : x))
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    } catch (e: any) { setError(e.message) }
    finally { setToggling(null) }
  }

  const habilitados = medios.filter(m => m.habilitado).length

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/mayorista/dashboard")}
              className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="font-bold text-gray-900">Medios de Pago</h1>
              <p className="text-xs text-gray-400">Elegí qué métodos aceptás de tus clientes</p>
            </div>
          </div>
          {guardado && (
            <span className="text-sm text-green-600 font-medium animate-pulse">✓ Guardado</span>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">{error}</div>
        )}

        {/* Resumen */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">💳</div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{habilitados} de {medios.length} habilitados</p>
            <p className="text-sm text-gray-500">Tus clientes verán solo los medios que tenés activos</p>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {medios.map(m => {
            const tipoStyle = TIPO_COLOR[m.tipo] || { bg: "#f3f4f6", color: "#374151" }
            const isToggling = toggling === m.id
            return (
              <div key={m.id}
                className={`bg-white rounded-2xl border transition-all ${
                  m.habilitado ? "border-gray-100" : "border-gray-100 opacity-60"
                }`}>
                <div className="flex items-center gap-4 p-4">
                  {/* Ícono */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    m.habilitado ? "bg-gray-50" : "bg-gray-100 grayscale"
                  }`}>
                    {m.icono || "💳"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{m.nombre}</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: tipoStyle.bg, color: tipoStyle.color }}>
                        {TIPO_LABEL[m.tipo] || m.tipo}
                      </span>
                      {m.integracion && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          🔗 {m.integracion}
                        </span>
                      )}
                    </div>
                    {m.descripcion && (
                      <p className="text-xs text-gray-400 mt-0.5">{m.descripcion}</p>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => !isToggling && toggle(m)}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      m.habilitado ? "bg-green-500" : "bg-gray-200"
                    } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                    title={m.habilitado ? "Deshabilitar" : "Habilitar"}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      m.habilitado ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {medios.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-gray-500 font-medium">No hay medios de pago disponibles</p>
            <p className="text-gray-400 text-sm mt-1">El administrador debe crear medios de pago primero</p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Los cambios se guardan automáticamente al tocar el switch
        </p>
      </main>
    </div>
  )
}
