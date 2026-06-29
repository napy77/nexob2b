"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
  distancia_km?: number | null
  solicitud: Solicitud | null
}

type Comercio = {
  lat?: number | null
  lng?: number | null
  rubros?: string[]
}

const ESTADO_CONFIG = {
  pendiente: { label: "Solicitud pendiente", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  aceptado:  { label: "Habilitado",          color: "bg-green-100 text-green-700 border-green-200" },
  rechazado: { label: "Rechazado",           color: "bg-red-100 text-red-700 border-red-200" },
}

const VISIBILIDAD_LABEL: Record<string, string> = {
  publico:    "🌐 Público",
  con_precio: "🏷️ Con precio",
  sin_precio: "🔒 Sin precio",
}

const RADIOS = [
  { value: 25,   label: "25 km" },
  { value: 50,   label: "50 km" },
  { value: 100,  label: "100 km" },
  { value: 200,  label: "200 km" },
  { value: 9999, label: "Todo el país" },
]

export default function ExplorarMayoristasPage() {
  const router = useRouter()

  const [comercio, setComercio] = useState<Comercio | null>(null)
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [solicitando, setSolicitando] = useState<string | null>(null)

  // Filtros activos
  const [radioKm, setRadioKm] = useState(50)
  const [rubrosActivos, setRubrosActivos] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [busquedaInput, setBusquedaInput] = useState("")
  const busquedaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Rubros del comercio (para filtro inteligente inicial)
  const [rubrosComercio, setRubrosComercio] = useState<string[]>([])

  // ─── Carga inicial: perfil del comercio → configurar filtros default ───
  useEffect(() => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }

    comerciosApi.getMe(token)
      .then((data) => {
        const c: Comercio = data.comercio || data
        setComercio(c)
        const rubros = (c.rubros || []).filter(Boolean)
        setRubrosComercio(rubros)
        setRubrosActivos(rubros) // default: filtrar por mis rubros
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("comercio_token")
          router.replace("/comercio/login")
        }
      })
  }, [router])

  // ─── Buscar mayoristas cuando cambian los filtros ───
  const buscar = useCallback(async () => {
    const token = localStorage.getItem("comercio_token")
    if (!token || !comercio) return

    setLoading(true)
    setError("")
    try {
      const data = await comerciosApi.getMayoristas(token, {
        lat: comercio.lat ?? null,
        lng: comercio.lng ?? null,
        radio_km: radioKm,
        rubros: rubrosActivos,
        busqueda,
      })
      setMayoristas(data.mayoristas || [])
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem("comercio_token")
        router.replace("/comercio/login")
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [comercio, radioKm, rubrosActivos, busqueda, router])

  useEffect(() => {
    if (comercio !== null) {
      buscar()
    }
  }, [comercio, radioKm, rubrosActivos, busqueda]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce búsqueda de texto
  const handleBusquedaInput = (val: string) => {
    setBusquedaInput(val)
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current)
    busquedaTimer.current = setTimeout(() => setBusqueda(val), 400)
  }

  const toggleRubro = (r: string) => {
    setRubrosActivos((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    )
  }

  const handleSolicitar = async (mayoristaId: string) => {
    const token = localStorage.getItem("comercio_token")!
    setSolicitando(mayoristaId)
    try {
      await comerciosApi.solicitarAlta(token, mayoristaId)
      buscar()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSolicitando(null)
    }
  }

  const tieneUbicacion = !!(comercio?.lat && comercio?.lng)
  const mayoristasConDistancia = mayoristas.filter((m) => m.distancia_km !== null && m.distancia_km !== undefined)
  const mayoristaSinDistancia = mayoristas.filter((m) => m.distancia_km == null)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
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
          {!loading && (
            <span className="text-sm text-gray-400">{mayoristas.length} encontrados</span>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">

        {/* Buscador */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre, rubro o ciudad..."
            value={busquedaInput}
            onChange={(e) => handleBusquedaInput(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Indicador de ubicación */}
          {tieneUbicacion ? (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium">
              📍 Cerca tuyo
            </span>
          ) : (
            <button
              onClick={() => router.push("/comercio/perfil")}
              className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium hover:bg-amber-100 transition-colors"
            >
              ⚠️ Configurar ubicación
            </button>
          )}

          {/* Radio */}
          {tieneUbicacion && RADIOS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRadioKm(r.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                radioKm === r.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Chips de rubros */}
        {rubrosComercio.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 font-medium">Rubros:</span>
            {rubrosComercio.map((r) => (
              <button
                key={r}
                onClick={() => toggleRubro(r)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  rubrosActivos.includes(r)
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 line-through opacity-60"
                }`}
              >
                {r} {rubrosActivos.includes(r) ? "✓" : ""}
              </button>
            ))}
            {rubrosActivos.length > 0 && (
              <button
                onClick={() => setRubrosActivos([])}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Ver todos los rubros
              </button>
            )}
            {rubrosActivos.length === 0 && rubrosComercio.length > 0 && (
              <button
                onClick={() => setRubrosActivos(rubrosComercio)}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline"
              >
                Volver a mis rubros
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Aviso sin ubicación */}
        {!tieneUbicacion && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg">📍</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Configurá tu ubicación para ver mayoristas cerca tuyo</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Activá el orden por distancia en{" "}
                <button onClick={() => router.push("/comercio/perfil")} className="underline font-medium">tu perfil</button>{" "}
                → sección "Ubicación en el mapa"
              </p>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : mayoristas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">🏭</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay mayoristas en esta búsqueda</h3>
            <p className="text-sm text-gray-500 mb-4">
              {tieneUbicacion
                ? `Ningún mayorista encontrado en ${radioKm === 9999 ? "todo el país" : `${radioKm} km`}${rubrosActivos.length ? " con los rubros seleccionados" : ""}.`
                : "Todavía no hay mayoristas disponibles con estos filtros."
              }
            </p>
            {tieneUbicacion && radioKm < 9999 && (
              <button
                onClick={() => setRadioKm(RADIOS.find((r) => r.value > radioKm)?.value || 9999)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Ampliar radio de búsqueda →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mayoristas con distancia */}
            {mayoristasConDistancia.map((m) => (
              <MayoristaCard
                key={m.id}
                m={m}
                onVerCatalogo={() => router.push(`/comercio/catalogo/${m.id}`)}
                onSolicitar={() => handleSolicitar(m.id)}
                solicitando={solicitando === m.id}
              />
            ))}

            {/* Separador si hay ambos grupos */}
            {mayoristasConDistancia.length > 0 && mayoristaSinDistancia.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">Sin ubicación cargada</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            )}

            {/* Mayoristas sin coordenadas */}
            {mayoristaSinDistancia.map((m) => (
              <MayoristaCard
                key={m.id}
                m={m}
                onVerCatalogo={() => router.push(`/comercio/catalogo/${m.id}`)}
                onSolicitar={() => handleSolicitar(m.id)}
                solicitando={solicitando === m.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function MayoristaCard({
  m,
  onVerCatalogo,
  onSolicitar,
  solicitando,
}: {
  m: Mayorista
  onVerCatalogo: () => void
  onSolicitar: () => void
  solicitando: boolean
}) {
  const solicitud = m.solicitud
  const estadoConf = solicitud ? ESTADO_CONFIG[solicitud.estado] : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
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
            {m.distancia_km != null && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                📍 {m.distancia_km < 1 ? `${Math.round(m.distancia_km * 1000)} m` : `${m.distancia_km} km`}
              </span>
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
          <button
            onClick={onVerCatalogo}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Ver catálogo
          </button>
          {!solicitud && (
            <button
              onClick={onSolicitar}
              disabled={solicitando}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {solicitando ? "Solicitando..." : "Solicitar alta"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
