"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mayoristasApi } from "../../../../lib/mayorista/api"

type Mayorista = {
  id: string
  nombre: string
  email: string
  cuit: string
  telefono?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  zonas: string[]
  estado: "pendiente" | "aprobado" | "suspendido"
  created_at: string
}

const ESTADO_LABELS = {
  pendiente: { label: "En revisión", color: "bg-yellow-100 text-yellow-700" },
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  suspendido: { label: "Suspendido", color: "bg-red-100 text-red-700" },
}

export default function DashboardPage() {
  const router = useRouter()
  const [mayorista, setMayorista] = useState<Mayorista | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) {
      router.replace("/mayorista/login")
      return
    }

    mayoristasApi.getMe(token)
      .then((data) => setMayorista(data.mayorista))
      .catch(() => {
        localStorage.removeItem("mayorista_token")
        router.replace("/mayorista/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("mayorista_token")
    localStorage.removeItem("mayorista")
    router.push("/mayorista/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Cargando...</div>
      </div>
    )
  }

  if (!mayorista) return null

  const estado = ESTADO_LABELS[mayorista.estado]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Portal Mayorista</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{mayorista.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {mayorista.nombre}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estado.color}`}>
              {estado.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm">CUIT: {mayorista.cuit}</p>
        </div>

        {/* Alerta si pendiente */}
        {mayorista.estado === "pendiente" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Tu cuenta está en revisión</p>
              <p className="text-sm text-yellow-700 mt-0.5">El equipo de Nexo B2B revisará tu solicitud y te avisará por email cuando sea aprobada.</p>
            </div>
          </div>
        )}

        {/* Cards de info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Ubicación</p>
            <p className="font-semibold text-gray-900">
              {mayorista.ciudad && mayorista.provincia
                ? `${mayorista.ciudad}, ${mayorista.provincia}`
                : mayorista.provincia || mayorista.ciudad || "—"}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Rubros</p>
            <p className="font-semibold text-gray-900">
              {mayorista.rubros.length > 0 ? `${mayorista.rubros.length} rubro(s)` : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1 truncate">{mayorista.rubros.join(", ")}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Zona de influencia</p>
            <p className="font-semibold text-gray-900">
              {mayorista.zonas.length > 0 ? `${mayorista.zonas.length} provincia(s)` : "Sin definir"}
            </p>
            <p className="text-xs text-gray-400 mt-1 truncate">{mayorista.zonas.join(", ")}</p>
          </div>
        </div>

        {/* Navegación */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Secciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NavCard
            href="/mayorista/productos"
            icon="📦"
            title="Mis productos"
            description="Gestioná tu catálogo: precios, stock y descripción"
            disabled={mayorista.estado !== "aprobado"}
          />
          <NavCard
            href="/mayorista/perfil"
            icon="👤"
            title="Mi perfil"
            description="Actualizá los datos de tu empresa"
          />
          <NavCard
            href="/mayorista/zona"
            icon="🗺️"
            title="Zona de influencia"
            description="Definí en qué provincias distribuís"
          />
        </div>

        {mayorista.estado !== "aprobado" && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            Mis productos estará disponible una vez que tu cuenta sea aprobada.
          </p>
        )}
      </main>
    </div>
  )
}

function NavCard({
  href,
  icon,
  title,
  description,
  disabled = false,
}: {
  href: string
  icon: string
  title: string
  description: string
  disabled?: boolean
}) {
  return (
    <a
      href={disabled ? undefined : href}
      className={`block bg-white rounded-2xl border p-5 transition-all ${
        disabled
          ? "border-gray-100 opacity-50 cursor-not-allowed"
          : "border-gray-100 hover:border-blue-200 hover:shadow-sm cursor-pointer"
      }`}
    >
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
