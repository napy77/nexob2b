"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mayoristasApi, ApiError } from "../../../../lib/mayorista/api"

type Comercio = {
  id: string
  nombre: string
  cuit: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
}

type Contacto = {
  id: string
  comercio_id: string
  mayorista_id: string
  estado: "pendiente" | "aceptado" | "rechazado"
  mensaje?: string
  created_at: string
  comercio: Comercio | null
}

const TABS = [
  { key: "pendiente", label: "Pendientes", color: "text-yellow-600" },
  { key: "aceptado", label: "Aceptados", color: "text-green-600" },
  { key: "rechazado", label: "Rechazados", color: "text-red-500" },
]

export default function MayoristaContactosPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"pendiente" | "aceptado" | "rechazado">("pendiente")
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [error, setError] = useState("")

  const cargar = () => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }
    setLoading(true)
    mayoristasApi.getContactos(token, tab)
      .then((data) => setContactos(data.contactos))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("mayorista_token"); router.replace("/mayorista/login")
        } else setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [tab, router])

  const handleAccion = async (solicitudId: string, estado: "aceptado" | "rechazado") => {
    const token = localStorage.getItem("mayorista_token")!
    setAccionando(solicitudId)
    try {
      await mayoristasApi.actualizarContacto(token, solicitudId, estado)
      cargar()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAccionando(null)
    }
  }

  const pendientes = contactos.filter((c) => c.estado === "pendiente").length

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Contactos</span>
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
                  ? `border-blue-600 text-blue-600`
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

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
        ) : contactos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">
              {tab === "pendiente" ? "⏳" : tab === "aceptado" ? "✅" : "❌"}
            </div>
            <p className="text-gray-500 text-sm">
              {tab === "pendiente" && "No hay solicitudes pendientes."}
              {tab === "aceptado" && "No hay comercios aceptados aún."}
              {tab === "rechazado" && "No hay solicitudes rechazadas."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contactos.map((c) => {
              const comercio = c.comercio
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{comercio?.nombre || "Comercio desconocido"}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">CUIT: {comercio?.cuit}</p>
                      <p className="text-sm text-gray-500">
                        {[comercio?.ciudad, comercio?.provincia].filter(Boolean).join(", ")}
                      </p>
                      {comercio?.rubros?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {comercio.rubros.map((r) => (
                            <span key={r} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{r}</span>
                          ))}
                        </div>
                      )}
                      {c.mensaje && (
                        <p className="text-sm text-gray-400 mt-2 italic">"{c.mensaje}"</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-gray-400">
                        {comercio?.email && <span>{comercio.email}</span>}
                        {comercio?.telefono && <span>{comercio.telefono}</span>}
                      </div>
                    </div>

                    {tab === "pendiente" && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAccion(c.id, "aceptado")}
                          disabled={accionando === c.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                        >
                          Aceptar
                        </button>
                        <button
                          onClick={() => handleAccion(c.id, "rechazado")}
                          disabled={accionando === c.id}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}

                    {tab === "aceptado" && comercio && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {comercio.telefono && (
                          <a href={`https://wa.me/${comercio.telefono.replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors text-center">
                            WhatsApp
                          </a>
                        )}
                        <a href={`mailto:${comercio.email}`}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-center">
                          Email
                        </a>
                        <button
                          onClick={() => handleAccion(c.id, "rechazado")}
                          disabled={accionando === c.id}
                          className="px-4 py-2 border border-red-100 text-red-500 rounded-xl text-xs font-medium hover:bg-red-50 transition-colors"
                        >
                          Revocar acceso
                        </button>
                      </div>
                    )}

                    {tab === "rechazado" && (
                      <button
                        onClick={() => handleAccion(c.id, "aceptado")}
                        disabled={accionando === c.id}
                        className="px-4 py-2 border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors flex-shrink-0"
                      >
                        Aceptar
                      </button>
                    )}
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
