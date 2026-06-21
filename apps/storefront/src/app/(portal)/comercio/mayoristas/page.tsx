"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, ApiError } from "../../../../lib/comercio/api"

type Solicitud = {
  id: string
  estado: "pendiente" | "aceptado" | "rechazado"
  mayorista_id: string
}

type Mayorista = {
  id: string
  nombre: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  descripcion?: string
  visibilidad?: string
  solicitud: Solicitud | null
}

const ESTADO_CONFIG = {
  pendiente: { label: "Solicitud pendiente", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  aceptado: { label: "Habilitado", color: "bg-green-100 text-green-700 border-green-200" },
  rechazado: { label: "Rechazado", color: "bg-red-100 text-red-700 border-red-200" },
}

const VISIBILIDAD_LABEL: Record<string, string> = {
  publico: "🌐 Público",
  con_precio: "🏷️ Con precio",
  sin_precio: "🔒 Sin precio",
}

export default function ExplorarMayoristasPage() {
  const router = useRouter()
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [solicitando, setSolicitando] = useState<string | null>(null)

  const cargar = () => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }
    comerciosApi.getMayoristas(token)
      .then((data) => setMayoristas(data.mayoristas))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("comercio_token"); router.replace("/comercio/login")
        } else setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [router])

  const handleSolicitar = async (mayoristaId: string) => {
    const token = localStorage.getItem("comercio_token")!
    setSolicitando(mayoristaId)
    try {
      await comerciosApi.solicitarAlta(token, mayoristaId)
      cargar()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSolicitando(null)
    }
  }

  const filtrados = mayoristas.filter((m) =>
    !busqueda ||
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.provincia?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.rubros?.some((r) => r.toLowerCase().includes(busqueda.toLowerCase()))
  )

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando mayoristas...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/comercio/contactos")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Explorar mayoristas</span>
          </div>
          <span className="text-sm text-gray-400">{filtrados.length} disponibles</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <input
            type="search"
            placeholder="Buscar por nombre, provincia o rubro..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>
        )}

        {filtrados.length === 0 && !error ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">🏭</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay mayoristas disponibles</h3>
            <p className="text-sm text-gray-500">Todavía no hay mayoristas aprobados en el sistema.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((m) => {
              const solicitud = m.solicitud
              const estadoConf = solicitud ? ESTADO_CONFIG[solicitud.estado] : null

              return (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
                        {estadoConf && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estadoConf.color}`}>
                            {estadoConf.label}
                          </span>
                        )}
                        {m.visibilidad && (
                          <span className="text-xs text-gray-400">{VISIBILIDAD_LABEL[m.visibilidad]}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {[m.ciudad, m.provincia].filter(Boolean).join(", ")}
                      </p>
                      {m.rubros?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.rubros.map((r) => (
                            <span key={r} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{r}</span>
                          ))}
                        </div>
                      )}
                      {m.descripcion && (
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{m.descripcion}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {/* Siempre se puede ver el catálogo del mayorista */}
                      <button
                        onClick={() => router.push(`/comercio/catalogo/${m.id}`)}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Ver catálogo
                      </button>
                      {!solicitud && (
                        <button
                          onClick={() => handleSolicitar(m.id)}
                          disabled={solicitando === m.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                        >
                          {solicitando === m.id ? "Solicitando..." : "Solicitar alta"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
