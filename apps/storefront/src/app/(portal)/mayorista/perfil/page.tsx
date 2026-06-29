"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mayoristasApi, RUBROS_DISPONIBLES, fileToBase64 } from "../../../../lib/mayorista/api"
import { MapaPicker } from "../../comercio/perfil/MapaPicker"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type Mayorista = {
  id: string
  nombre: string
  email: string
  cuit: string
  telefono?: string
  direccion?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  zonas: string[]
  estado: string
  visibilidad?: string
  descripcion?: string
  condicion_fiscal?: string
  logo_url?: string
  lat?: number | null
  lng?: number | null
}

type TipoImpositivo = { id: string; nombre: string; descripcion?: string }

const PROVINCIAS = [
  "Buenos Aires","Ciudad Autónoma de Buenos Aires","Catamarca","Chaco","Chubut",
  "Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja",
  "Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis",
  "Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán",
]

const VISIBILIDAD_OPCIONES = [
  {
    value: "publico",
    label: "Público",
    description: "Cualquier comercio logueado ve tus productos, precios y puede contactarte directamente.",
    icon: "🌐",
    color: "border-green-500 bg-green-50",
    selectedColor: "border-green-500 bg-green-50 ring-2 ring-green-500",
  },
  {
    value: "con_precio",
    label: "Con precio, sin compra directa",
    description: "Los comercios ven tus productos y precios, pero necesitan solicitar alta para poder contactarte.",
    icon: "🏷️",
    color: "border-blue-300 bg-blue-50",
    selectedColor: "border-blue-500 bg-blue-50 ring-2 ring-blue-500",
  },
  {
    value: "sin_precio",
    label: "Sin precio",
    description: "Los comercios ven tus productos pero sin precios. Deben solicitar alta para ver precios y contactarte.",
    icon: "🔒",
    color: "border-gray-300 bg-gray-50",
    selectedColor: "border-gray-500 bg-gray-50 ring-2 ring-gray-500",
  },
]

const TIPOS_FALLBACK: TipoImpositivo[] = [
  { id: "ri", nombre: "Responsable Inscripto", descripcion: "Factura A — precio + IVA" },
  { id: "mono", nombre: "Monotributo", descripcion: "Factura C — precio con impuestos incluidos" },
  { id: "exento", nombre: "Exento", descripcion: "Sin cobro de IVA" },
  { id: "cf", nombre: "Consumidor Final", descripcion: "Persona física sin CUIT empresa" },
]

export default function PerfilPage() {
  const router = useRouter()
  const [mayorista, setMayorista] = useState<Mayorista | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [tiposImpositivos, setTiposImpositivos] = useState<TipoImpositivo[]>(TIPOS_FALLBACK)

  const [form, setForm] = useState({
    nombre: "", telefono: "", direccion: "", ciudad: "", provincia: "",
    rubros: [] as string[], visibilidad: "sin_precio", descripcion: "", condicion_fiscal: "",
    lat: null as number | null, lng: null as number | null,
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoBase64, setLogoBase64] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${BACKEND_URL}/store/taxonomia`, { headers: { "x-publishable-api-key": PUB_KEY } })
      .then((r) => r.json())
      .then((data) => { if (data.tipos_impositivos?.length) setTiposImpositivos(data.tipos_impositivos) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }
    mayoristasApi.getMe(token)
      .then((data) => {
        const m = data.mayorista
        setMayorista(m)
        setForm({
          nombre: m.nombre || "",
          telefono: m.telefono || "",
          direccion: m.direccion || "",
          ciudad: m.ciudad || "",
          provincia: m.provincia || "",
          rubros: m.rubros || [],
          visibilidad: m.visibilidad || "sin_precio",
          descripcion: m.descripcion || "",
          condicion_fiscal: m.condicion_fiscal || "",
          lat: m.lat ?? null,
          lng: m.lng ?? null,
        })
        if (m.logo_url) setLogoPreview(`${BACKEND_URL}${m.logo_url}`)
      })
      .catch(() => { localStorage.removeItem("mayorista_token"); router.replace("/mayorista/login") })
      .finally(() => setLoading(false))
  }, [router])

  const toggleRubro = (r: string) => {
    setForm((f) => ({
      ...f,
      rubros: f.rubros.includes(r) ? f.rubros.filter((x) => x !== r) : [...f.rubros, r],
    }))
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileToBase64(file)
    setLogoBase64(b64)
    setLogoPreview(b64)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.rubros.length === 0) { setError("Seleccioná al menos un rubro."); return }
    setError(""); setSaving(true); setSuccess(false)
    try {
      const token = localStorage.getItem("mayorista_token")!
      const payload: Record<string, any> = { ...form, lat: form.lat, lng: form.lng }
      if (logoBase64) payload.logo_base64 = logoBase64
      await mayoristasApi.updateMe(token, payload)
      setSuccess(true)
      setLogoBase64(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Mi perfil</span>
          </div>
          <span className="text-sm text-gray-500">{mayorista?.email}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="text-sm text-gray-500 mt-1">Actualizá los datos de tu empresa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Logo de la empresa</h2>
            <p className="text-sm text-gray-400 mb-4">Aparece en tus Órdenes de Venta y documentos</p>
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  : <span className="text-3xl">🏢</span>
                }
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {logoPreview ? "Cambiar logo" : "Subir logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                <p className="text-xs text-gray-400 mt-2">PNG, JPG o WEBP · Máx. 2MB</p>
                {logoBase64 && <p className="text-xs text-green-600 mt-1">✓ Listo para guardar</p>}
              </div>
            </div>
          </div>

          {/* Datos básicos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800 mb-2">Datos de la empresa</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón social *</label>
                <input required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                <input value={mayorista?.cuit || ""} disabled
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input value={form.ciudad} onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                <select value={form.provincia} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccioná una provincia</option>
                  {PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={3} placeholder="Contá brevemente qué vendés y a qué tipo de comercios le conviene trabajar con vos..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>

          {/* Condición fiscal */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Condición fiscal ante ARCA</h2>
            <p className="text-sm text-gray-400 mb-4">Tu situación impositiva determina cómo se emiten las facturas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tiposImpositivos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, condicion_fiscal: t.nombre }))}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    form.condicion_fiscal === t.nombre
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{t.nombre}</div>
                      {t.descripcion && <div className="text-xs text-gray-500 mt-0.5">{t.descripcion}</div>}
                    </div>
                    {form.condicion_fiscal === t.nombre && (
                      <span className="text-blue-600 mt-0.5">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Visibilidad del catálogo */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Visibilidad del catálogo</h2>
            <p className="text-sm text-gray-400 mb-4">Controlá cómo ven tus productos los comercios que aún no tienen relación con vos</p>
            <div className="space-y-3">
              {VISIBILIDAD_OPCIONES.map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visibilidad: op.value }))}
                  className={`w-full text-left border rounded-xl p-4 transition-all ${
                    form.visibilidad === op.value ? op.selectedColor : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{op.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{op.label}</span>
                        {form.visibilidad === op.value && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Activo</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{op.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Los comercios con relación <strong>aceptada</strong> siempre ven precios y pueden contactarte, sin importar este ajuste.
            </p>
          </div>

          {/* Ubicación en mapa */}
          <MapaPicker
            lat={form.lat}
            lng={form.lng}
            direccion={form.direccion}
            ciudad={form.ciudad}
            provincia={form.provincia}
            onChange={(data) => {
              setForm((f) => ({
                ...f,
                lat: data.lat,
                lng: data.lng,
                ...(data.direccion ? { direccion: data.direccion } : {}),
                ...(data.ciudad ? { ciudad: data.ciudad } : {}),
                ...(data.provincia ? { provincia: data.provincia } : {}),
              }))
            }}
          />

          {/* Rubros */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Rubros *</h2>
            <p className="text-sm text-gray-400 mb-4">Seleccioná los rubros en los que operás</p>
            <div className="flex flex-wrap gap-2">
              {RUBROS_DISPONIBLES.map((r) => (
                <button key={r} type="button" onClick={() => toggleRubro(r)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    form.rubros.includes(r)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
              ✓ Perfil actualizado correctamente
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/mayorista/dashboard")}
              className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
