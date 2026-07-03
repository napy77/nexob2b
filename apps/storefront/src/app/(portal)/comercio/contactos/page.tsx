"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, ApiError } from "../../../../lib/comercio/api"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"

type Contacto = {
  id: string
  nombre: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  visibilidad?: string
  logo_url?: string | null
  solicitud: {
    id: string
    estado: "pendiente" | "aceptado" | "rechazado"
  } | null
  contacto: {
    nombre: string
    celular: string | null
    email: string | null
    es_vendedor: boolean
  }
}

const TABS = [
  { key: "aceptado",  label: "Aprobados",  icon: "✅", empty: "Todavía no tenés mayoristas aprobados." },
  { key: "pendiente", label: "Pendientes", icon: "⏳", empty: "No tenés solicitudes pendientes."      },
  { key: "rechazado", label: "Rechazados", icon: "❌", empty: "No tenés solicitudes rechazadas."       },
]

export default function ComercioContactosPage() {
  const router = useRouter()
  const [mayoristas, setMayoristas] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"aceptado" | "pendiente" | "rechazado">("aceptado")

  useEffect(() => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }
    comerciosApi.getMayoristas(token)
      .then((data) => setMayoristas(data.mayoristas))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("comercio_token"); router.replace("/comercio/login")
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const filtrados = mayoristas.filter((m) =>
    tab === "aceptado"  ? m.solicitud?.estado === "aceptado"
    : tab === "pendiente" ? m.solicitud?.estado === "pendiente"
    : m.solicitud?.estado === "rechazado"
  )

  const pendientes = mayoristas.filter((m) => m.solicitud?.estado === "pendiente").length

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/comercio/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Mis contactos</span>
          </div>
          <button
            onClick={() => router.push("/comercio/mayoristas")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Explorar mayoristas
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
              {t.key === "pendiente" && pendientes > 0 && tab !== "pendiente" && (
                <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                  {pendientes}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">{TABS.find((t) => t.key === tab)?.icon}</div>
            <p className="text-gray-500 text-sm">{TABS.find((t) => t.key === tab)?.empty}</p>
            {tab === "aceptado" && (
              <button onClick={() => router.push("/comercio/mayoristas")}
                className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                Explorar mayoristas
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-4">
                  {/* Logo o avatar */}
                  <div className="w-12 h-12 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50">
                    {m.logo_url
                      ? <img src={`${BACKEND_URL}${m.logo_url}`} alt={m.nombre} className="w-full h-full object-contain" />
                      : <span className="text-xl font-bold text-gray-300">{m.nombre[0]}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Nombre y ubicación */}
                    <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
                    {(m.ciudad || m.provincia) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[m.ciudad, m.provincia].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {m.rubros?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.rubros.slice(0, 4).map((r) => (
                          <span key={r} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{r}</span>
                        ))}
                      </div>
                    )}

                    {/* Vendedor / Ejecutivo de ventas asignado — solo si aceptado */}
                    {tab === "aceptado" && (
                      <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {m.contacto.es_vendedor ? "🧑‍💼 Tu ejecutivo de ventas" : "📞 Contacto"}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">{m.contacto.nombre}</p>
                        <div className="flex flex-wrap gap-3">
                          {m.contacto.celular && (
                            <a
                              href={`https://wa.me/${m.contacto.celular.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola${m.contacto.es_vendedor ? ` ${m.contacto.nombre}` : ""}! Soy cliente de ${m.nombre} en Nexo B2B.`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              {m.contacto.celular}
                            </a>
                          )}
                          {m.contacto.email && (
                            <a
                              href={`mailto:${m.contacto.email}`}
                              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {m.contacto.email}
                            </a>
                          )}
                          {!m.contacto.celular && !m.contacto.email && (
                            <span className="text-xs text-gray-400 italic">Sin datos de contacto cargados</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {tab === "aceptado" && (
                      <button
                        onClick={() => router.push(`/comercio/productos?mayorista_id=${m.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
                        Ver catálogo
                      </button>
                    )}
                    {tab === "pendiente" && (
                      <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-sm font-medium border border-yellow-200 whitespace-nowrap">
                        En revisión
                      </span>
                    )}
                    {tab === "rechazado" && (
                      <a href={`mailto:${m.email}`}
                        className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-center whitespace-nowrap">
                        Contactar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
