"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const TIPO_LABEL: Record<string, string> = {
  retiro:       "Retiro en depósito",
  envio_propio: "Envío propio",
  moto:         "Mensajería / Moto",
  correo:       "Correo",
  flete:        "Flete tercerizado",
}

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  retiro:       { bg: "#d1fae5", color: "#065f46" },
  envio_propio: { bg: "#dbeafe", color: "#1e40af" },
  moto:         { bg: "#fce7f3", color: "#9d174d" },
  correo:       { bg: "#fef3c7", color: "#92400e" },
  flete:        { bg: "#ede9fe", color: "#5b21b6" },
}

type Transporte = {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  icono: string | null
  habilitado: boolean
  orden: number
  porcentaje_costo: number
}

type PorcentajeLocal = Record<string, string>

export default function TransportesMayoristaPage() {
  const router = useRouter()
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [guardado, setGuardado] = useState(false)
  const [porcentajes, setPorcentajes] = useState<PorcentajeLocal>({})
  const [guardandoPct, setGuardandoPct] = useState<string | null>(null)

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
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/transportes`, { headers: headers() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const lista: Transporte[] = data.transportes || []
      setTransportes(lista)
      const pct: PorcentajeLocal = {}
      lista.forEach(t => { pct[t.id] = String(t.porcentaje_costo ?? 0) })
      setPorcentajes(pct)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const toggle = async (t: Transporte) => {
    setToggling(t.id)
    setGuardado(false)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/transportes`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ transporte_id: t.id, habilitado: !t.habilitado }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setTransportes(prev => prev.map(x => x.id === t.id ? { ...x, habilitado: !x.habilitado } : x))
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    } catch (e: any) { setError(e.message) }
    finally { setToggling(null) }
  }

  const guardarPorcentaje = async (t: Transporte) => {
    const valor = parseFloat(porcentajes[t.id] || "0") || 0
    if (valor === t.porcentaje_costo) return
    setGuardandoPct(t.id)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/transportes`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ transporte_id: t.id, porcentaje_costo: valor }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setTransportes(prev => prev.map(x => x.id === t.id ? { ...x, porcentaje_costo: valor } : x))
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    } catch (e: any) { setError(e.message) }
    finally { setGuardandoPct(null) }
  }

  const habilitados = transportes.filter(t => t.habilitado).length

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
              <h1 className="font-bold text-gray-900">Transportes</h1>
              <p className="text-xs text-gray-400">Elegí qué opciones de envío ofrecés a tus clientes</p>
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
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">🚚</div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{habilitados} de {transportes.length} habilitados</p>
            <p className="text-sm text-gray-500">Tus clientes verán solo las opciones que tenés activas al hacer un pedido</p>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {transportes.map(t => {
            const tipoStyle = TIPO_COLOR[t.tipo] || { bg: "#f3f4f6", color: "#374151" }
            const isToggling = toggling === t.id
            return (
              <div key={t.id}
                className={`bg-white rounded-2xl border transition-all ${
                  t.habilitado ? "border-gray-100" : "border-gray-100 opacity-60"
                }`}>
                <div className="flex items-center gap-4 p-4">
                  {/* Ícono */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    t.habilitado ? "bg-gray-50" : "bg-gray-100 grayscale"
                  }`}>
                    {t.icono || "🚚"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{t.nombre}</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: tipoStyle.bg, color: tipoStyle.color }}>
                        {TIPO_LABEL[t.tipo] || t.tipo}
                      </span>
                    </div>
                    {t.descripcion && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.descripcion}</p>
                    )}
                    {/* % costo */}
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-xs text-gray-500 whitespace-nowrap">% Costo de envío:</label>
                      <div className="relative w-24">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={porcentajes[t.id] ?? "0"}
                          onChange={e => setPorcentajes(p => ({ ...p, [t.id]: e.target.value }))}
                          onBlur={() => guardarPorcentaje(t)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          disabled={guardandoPct === t.id}
                        />
                        <span className="absolute right-2 top-1 text-xs text-gray-400">%</span>
                      </div>
                      {guardandoPct === t.id && (
                        <span className="text-xs text-blue-400">Guardando...</span>
                      )}
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => !isToggling && toggle(t)}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      t.habilitado ? "bg-blue-500" : "bg-gray-200"
                    } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                    title={t.habilitado ? "Deshabilitar" : "Habilitar"}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      t.habilitado ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {transportes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🚚</p>
            <p className="text-gray-500 font-medium">No hay tipos de transporte disponibles</p>
            <p className="text-gray-400 text-sm mt-1">El administrador debe crear transportes primero</p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Los cambios se guardan automáticamente al tocar el switch o al salir del campo %
        </p>
      </main>
    </div>
  )
}
