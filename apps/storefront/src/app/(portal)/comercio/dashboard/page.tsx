"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, ApiError } from "../../../../lib/comercio/api"

type Comercio = {
  id: string
  nombre: string
  email: string
  cuit: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  estado: "pendiente" | "aprobado" | "suspendido"
}

const ESTADO_LABELS = {
  pendiente: { label: "En revisión", color: "bg-yellow-100 text-yellow-700" },
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  suspendido: { label: "Suspendido", color: "bg-red-100 text-red-700" },
}

export default function ComercioDashboardPage() {
  const router = useRouter()
  const [comercio, setComercio] = useState<Comercio | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }
    comerciosApi.getMe(token)
      .then((data) => setComercio(data.comercio))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("comercio_token")
          router.replace("/comercio/login")
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("comercio_token")
    localStorage.removeItem("comercio")
    router.push("/comercio/login")
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  )
  if (!comercio) return null

  const estado = ESTADO_LABELS[comercio.estado]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Portal Comercios</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{comercio.email}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {comercio.nombre}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estado.color}`}>
              {estado.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm">CUIT: {comercio.cuit}</p>
        </div>

        {comercio.estado === "pendiente" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Tu cuenta está en revisión</p>
              <p className="text-sm text-yellow-700 mt-0.5">Una vez aprobada podrás explorar el catálogo de mayoristas.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Ubicación</p>
            <p className="font-semibold text-gray-900">
              {comercio.ciudad && comercio.provincia
                ? `${comercio.ciudad}, ${comercio.provincia}`
                : comercio.provincia || comercio.ciudad || "—"}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Tipo de comercio</p>
            <p className="font-semibold text-gray-900">
              {comercio.rubros.length > 0 ? comercio.rubros.join(", ") : "—"}
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-4">Secciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NavCard
            href="/comercio/catalogo"
            icon="🛒"
            title="Catálogo de productos"
            description="Explorá productos de mayoristas disponibles en la plataforma"
            disabled={comercio.estado !== "aprobado"}
          />
          <NavCard
            href="/comercio/contactos"
            icon="🤝"
            title="Mis contactos"
            description="Gestioná tus relaciones con mayoristas y explorá nuevos"
            disabled={comercio.estado !== "aprobado"}
          />
          <NavCard
            href="/comercio/perfil"
            icon="🏪"
            title="Mi perfil"
            description="Actualizá los datos de tu comercio"
          />
        </div>

        {comercio.estado !== "aprobado" && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            El catálogo estará disponible una vez que tu cuenta sea aprobada.
          </p>
        )}
      </main>
    </div>
  )
}

function NavCard({ href, icon, title, description, disabled = false }: {
  href: string; icon: string; title: string; description: string; disabled?: boolean
}) {
  return (
    <a href={disabled ? undefined : href}
      className={`block bg-white rounded-2xl border p-5 transition-all ${
        disabled
          ? "border-gray-100 opacity-50 cursor-not-allowed"
          : "border-gray-100 hover:border-blue-200 hover:shadow-sm cursor-pointer"
      }`}>
      <div className="flex items-start gap-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </a>
  )
}
