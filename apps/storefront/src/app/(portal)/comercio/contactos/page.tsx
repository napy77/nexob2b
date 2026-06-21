"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, ApiError } from "../../../../lib/comercio/api"

type Mayorista = {
  id: string
  nombre: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  visibilidad?: string
  solicitud: {
    id: string
    estado: "pendiente" | "aceptado" | "rechazado"
  } | null
}

const TABS = [
  { key: "aceptado", label: "Aprobados", icon: "✅", empty: "Todavía no tenés mayoristas aprobados." },
  { key: "pendiente", label: "Pendientes", icon: "⏳", empty: "No tenés solicitudes pendientes." },
  { key: "rechazado", label: "Rechazados", icon: "❌", empty: "No tenés solicitudes rechazadas." },
]

const VISIBILIDAD_LABEL: Record<string, string> = {
  publico: "🌐 Público",
  con_precio: "🏷️ Con precio",
  sin_precio: "🔒 Sin precio",
}

export default function ComercioContactosPage() {
  const router = useRouter()
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
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
    tab === "aceptado" ? m.solicitud?.estado === "aceptado"
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
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
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
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
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
              <button
                onClick={() => router.push("/comercio/mayoristas")}
                className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Explorar mayoristas
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{m.nombre}</h3>
                      {m.visibilidad && (
                        <span className="text-xs text-gray-400">{VISIBILIDAD_LABEL[m.visibilidad]}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{[m.ciudad, m.provincia].filter(Boolean).join(", ")}</p>
                    {m.rubros?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.rubros.map((r) => (
                          <span key={r} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {tab === "aceptado" && (
                      <>
                        <button
                          onClick={() => router.push(`/comercio/catalogo/${m.id}`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Ver catálogo
                        </button>
                        {m.telefono && (
                          <a
                            href={`https://wa.me/${m.telefono.replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors text-center"
                          >
                            WhatsApp
                          </a>
                        )}
                      </>
                    )}
                    {tab === "pendiente" && (
                      <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-sm font-medium border border-yellow-200">
                        En revisión
                      </span>
                    )}
                    {tab === "rechazado" && (
                      <a
                        href={`mailto:${m.email}`}
                        className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-center"
                      >
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
