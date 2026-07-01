"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mayoristasApi } from "../../../../lib/mayorista/api"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

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

type Orden = {
  id: string
  numero: string
  comercio_id: string
  comercio_nombre?: string
  estado: string
  total: number
  created_at: string
  items: { nombre: string; cantidad: number; unidad: string }[]
}

const ESTADO_LABELS = {
  pendiente: { label: "En revisión", color: "bg-yellow-100 text-yellow-700" },
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  suspendido: { label: "Suspendido", color: "bg-red-100 text-red-700" },
}

const ORDEN_ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: "Pendiente",  color: "#92400e", bg: "#fef3c7" },
  confirmado: { label: "Confirmado", color: "#1e40af", bg: "#dbeafe" },
  enviado:    { label: "Enviado",    color: "#5b21b6", bg: "#ede9fe" },
  entregado:  { label: "Entregado",  color: "#065f46", bg: "#d1fae5" },
  cancelado:  { label: "Cancelado",  color: "#991b1b", bg: "#fee2e2" },
}

export default function DashboardPage() {
  const router = useRouter()
  const [mayorista, setMayorista] = useState<Mayorista | null>(null)
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [comerciosMap, setComerciosMap] = useState<Record<string, string>>({}) // fallback, ya viene en comercio_nombre
  const [loading, setLoading] = useState(true)
  const [loadingOrdenes, setLoadingOrdenes] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }

    mayoristasApi.getMe(token)
      .then((data) => {
        setMayorista(data.mayorista)
        setLoading(false)

        // Cargar pedidos en paralelo
        if (data.mayorista.estado === "aprobado") {
          fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes`, {
            headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
          })
            .then((r) => r.json())
            .then(async (d) => {
              const ords: Orden[] = (d.ordenes || []).sort(
                (a: Orden, b: Orden) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              setOrdenes(ords)
            })
            .catch(() => {})
            .finally(() => setLoadingOrdenes(false))
        } else {
          setLoadingOrdenes(false)
        }
      })
      .catch(() => {
        localStorage.removeItem("mayorista_token")
        router.replace("/mayorista/login")
      })
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("mayorista_token")
    localStorage.removeItem("mayorista")
    router.push("/mayorista/login")
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  )
  if (!mayorista) return null

  const estado = ESTADO_LABELS[mayorista.estado]
  const pendientes = ordenes.filter((o) => o.estado === "pendiente")
  const recientes = ordenes.slice(0, 5) // últimos 5 en pantalla

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Portal Mayorista</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{mayorista.email}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {mayorista.nombre}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estado.color}`}>
              {estado.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm">CUIT: {mayorista.cuit}</p>
        </div>

        {mayorista.estado === "pendiente" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Tu cuenta está en revisión</p>
              <p className="text-sm text-yellow-700 mt-0.5">El equipo de Nexo B2B revisará tu solicitud y te avisará por email.</p>
            </div>
          </div>
        )}

        {/* Alerta de pedidos pendientes */}
        {pendientes.length > 0 && (
          <button onClick={() => router.push("/mayorista/pedidos")}
            className="w-full bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between text-left hover:bg-orange-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">
                  {pendientes.length} pedido{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""} de confirmación
                </p>
                <p className="text-xs text-orange-600">Tocá para gestionarlos</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
            <p className="text-sm text-gray-500 mb-1">Pedidos totales</p>
            <p className="font-semibold text-gray-900 text-2xl">{ordenes.length}</p>
            {pendientes.length > 0 && (
              <p className="text-xs text-orange-500 font-medium mt-1">{pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>

        {/* Pedidos recientes */}
        {mayorista.estado === "aprobado" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Pedidos recientes</h2>
              {ordenes.length > 5 && (
                <button onClick={() => router.push("/mayorista/pedidos")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Ver todos →
                </button>
              )}
            </div>

            {loadingOrdenes ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="text-gray-400 text-sm">Cargando pedidos...</p>
              </div>
            ) : ordenes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <span className="text-3xl block mb-3">📭</span>
                <p className="text-gray-500 text-sm">Todavía no recibiste pedidos.</p>
                <p className="text-gray-400 text-xs mt-1">Aparecerán acá cuando los comercios compren de tu catálogo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recientes.map((o) => {
                  const oe = ORDEN_ESTADO[o.estado] || { label: o.estado, color: "#374151", bg: "#f3f4f6" }
                  return (
                    <button key={o.id} onClick={() => router.push(`/mayorista/pedidos/${o.id}`)}
                      className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-blue-200 hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{o.numero}</span>
                          {o.estado === "pendiente" && (
                            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ color: oe.color, background: oe.bg }}>
                            {oe.label}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">${o.total.toLocaleString("es-AR")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-blue-600 font-medium">
                          {o.comercio_nombre || comerciosMap[o.comercio_id] || "Comercio"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(o.created_at).toLocaleDateString("es-AR", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                      {o.items.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {o.items.slice(0, 2).map((i) => `${i.cantidad} ${i.unidad} ${i.nombre}`).join(" · ")}
                          {o.items.length > 2 && ` · +${o.items.length - 2} más`}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Navegación */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Secciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NavCard href="/mayorista/productos" icon="📦" title="Mis productos"
            description="Gestioná tu catálogo: precios, stock y descripción"
            disabled={mayorista.estado !== "aprobado"} />
          <NavCard href="/mayorista/pedidos" icon="📋" title="Pedidos recibidos"
            description="Confirmá, despachá y gestioná las órdenes de compra"
            disabled={mayorista.estado !== "aprobado"}
            badge={pendientes.length || undefined} />
          <NavCard href="/mayorista/contactos" icon="🤝" title="Contactos"
            description="Gestioná los comercios que solicitan comprar con vos"
            disabled={mayorista.estado !== "aprobado"} />
          <NavCard href="/mayorista/vendedores" icon="🧑‍💼" title="Vendedores / Viajantes"
            description="Gestioná tu equipo y asignalos a cada comercio"
            disabled={mayorista.estado !== "aprobado"} />
          <NavCard href="/mayorista/mapa" icon="🗺️" title="Mapa de campo"
            description="Visualizá tus comercios y la ubicación en tiempo real de tus vendedores"
            disabled={mayorista.estado !== "aprobado"} />
          <NavCard href="/mayorista/rutas" icon="🛣️" title="Rutas de campo"
            description="Armá rutas de visita para tus vendedores y seguí el progreso en tiempo real"
            disabled={mayorista.estado !== "aprobado"} />
          <NavCard href="/mayorista/medios-pago" icon="💳" title="Medios de Pago"
            description="Habilitá o deshabilitá los métodos de pago que aceptás"
            disabled={mayorista.estado !== "aprobado"} />
          <NavCard href="/mayorista/transportes" icon="🚚" title="Transportes"
            description="Configurá las opciones de envío que ofrecés a tus clientes"
            disabled={mayorista.estado !== "aprobado"} />
          <NavCard href="/mayorista/estadisticas" icon="📊" title="Estadísticas"
            description="Ventas del mes, productos top, comercios y vendedores"
            disabled={mayorista.estado !== "aprobado"} />
          <NavCard href="/mayorista/perfil" icon="👤" title="Mi perfil"
            description="Actualizá los datos de tu empresa" />
        </div>

        {mayorista.estado !== "aprobado" && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            Las secciones estarán disponibles una vez aprobada tu cuenta.
          </p>
        )}
      </main>
    </div>
  )
}

function NavCard({ href, icon, title, description, disabled = false, badge }: {
  href: string; icon: string; title: string; description: string; disabled?: boolean; badge?: number
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
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {badge && badge > 0 ? (
              <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </a>
  )
}
