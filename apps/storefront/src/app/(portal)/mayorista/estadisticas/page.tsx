"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
]

function mesLabel(mesStr: string) {
  const [y, m] = mesStr.split("-")
  return `${MESES[Number(m) - 1]} ${y}`
}

function mesPrevio(mesStr: string) {
  const [y, m] = mesStr.split("-").map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function mesSiguiente(mesStr: string) {
  const [y, m] = mesStr.split("-").map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

type Stats = {
  cantidad_ordenes: number
  total_ventas: number
  ticket_promedio: number
  productos_top: { nombre: string; sku?: string; total_cantidad: number; total_monto: number }[]
  comercios_top: { comercio_id: string; nombre: string; cantidad_ordenes: number; total_monto: number }[]
  vendedores: { vendedor_id: string; nombre: string; cantidad_ordenes: number; total_monto: number }[]
  por_estado: Record<string, number>
}

type Respuesta = {
  mes: string
  actual: Stats
  anterior: Stats
  variacion: { total_ventas: number; cantidad_ordenes: number; ticket_promedio: number }
}

function Variacion({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs text-gray-400">sin cambio</span>
  const up = pct > 0
  return (
    <span className={`text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% vs mes anterior
    </span>
  )
}

function Card({ label, value, variacion, prefix = "$" }: { label: string; value: number; variacion: number; prefix?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">
        {prefix}{value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
      </p>
      <Variacion pct={variacion} />
    </div>
  )
}

export default function EstadisticasPage() {
  const router = useRouter()
  const [mes, setMes] = useState(mesActual())
  const [data, setData] = useState<Respuesta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const token = () => typeof window !== "undefined" ? localStorage.getItem("mayorista_token") || "" : ""

  const cargar = async (m: string) => {
    const t = token()
    if (!t) { router.replace("/mayorista/login"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/estadisticas?mes=${m}`, {
        headers: { "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar(mes) }, [mes])

  const cambiarMes = (dir: "prev" | "next") => {
    const nuevo = dir === "prev" ? mesPrevio(mes) : mesSiguiente(mes)
    // No ir más allá del mes actual
    if (nuevo > mesActual()) return
    setMes(nuevo)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Estadísticas</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Selector de mes */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => cambiarMes("prev")}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold text-lg">
            ‹
          </button>
          <span className="text-lg font-bold text-gray-900 w-44 text-center">{mesLabel(mes)}</span>
          <button onClick={() => cambiarMes("next")}
            disabled={mes >= mesActual()}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 font-bold text-lg disabled:opacity-30">
            ›
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data && (
          <>
            {/* Cards métricas clave */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card
                label="Ventas del mes"
                value={data.actual.total_ventas}
                variacion={data.variacion.total_ventas}
              />
              <Card
                label="Órdenes"
                value={data.actual.cantidad_ordenes}
                variacion={data.variacion.cantidad_ordenes}
                prefix=""
              />
              <Card
                label="Ticket promedio"
                value={data.actual.ticket_promedio}
                variacion={data.variacion.ticket_promedio}
              />
            </div>

            {/* Breakdown por estado */}
            {Object.keys(data.actual.por_estado).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-4">Órdenes por estado</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.actual.por_estado).map(([estado, cant]) => {
                    const COLORS: Record<string, string> = {
                      pendiente: "bg-yellow-50 text-yellow-800",
                      confirmado: "bg-blue-50 text-blue-800",
                      enviado: "bg-purple-50 text-purple-800",
                      entregado: "bg-green-50 text-green-800",
                      cancelado: "bg-red-50 text-red-700",
                      devuelto: "bg-orange-50 text-orange-800",
                    }
                    return (
                      <div key={estado} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${COLORS[estado] || "bg-gray-100 text-gray-700"}`}>
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}: {cant}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Productos top */}
            {data.actual.productos_top.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-4">🏆 Productos más vendidos</h3>
                <div className="space-y-3">
                  {data.actual.productos_top.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                          {p.sku && <p className="text-xs text-gray-400">SKU: {p.sku}</p>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right ml-4">
                        <p className="text-sm font-bold text-gray-900">${p.total_monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-gray-400">{p.total_cantidad} unid.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comercios top */}
            {data.actual.comercios_top.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-4">🏪 Comercios top</h3>
                <div className="space-y-3">
                  {data.actual.comercios_top.map((c, i) => (
                    <div key={c.comercio_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
                        <p className="text-sm font-medium text-gray-900 truncate">{c.nombre}</p>
                      </div>
                      <div className="flex-shrink-0 text-right ml-4">
                        <p className="text-sm font-bold text-gray-900">${c.total_monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-gray-400">{c.cantidad_ordenes} {c.cantidad_ordenes === 1 ? "orden" : "órdenes"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vendedores */}
            {data.actual.vendedores.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-4">👤 Rendimiento vendedores</h3>
                <div className="space-y-3">
                  {data.actual.vendedores.map((v, i) => (
                    <div key={v.vendedor_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
                        <p className="text-sm font-medium text-gray-900 truncate">{v.nombre}</p>
                      </div>
                      <div className="flex-shrink-0 text-right ml-4">
                        <p className="text-sm font-bold text-gray-900">${v.total_monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-gray-400">{v.cantidad_ordenes} {v.cantidad_ordenes === 1 ? "orden" : "órdenes"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sin datos */}
            {data.actual.cantidad_ordenes === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-sm">Sin órdenes en {mesLabel(mes)}</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
