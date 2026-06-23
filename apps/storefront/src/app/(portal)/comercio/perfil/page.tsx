"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, RUBROS_DISPONIBLES, PROVINCIAS_ARGENTINA, ApiError } from "../../../../lib/comercio/api"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type TipoImpositivo = { id: string; nombre: string; descripcion?: string }

const TIPOS_FALLBACK: TipoImpositivo[] = [
  { id: "ri", nombre: "Responsable Inscripto", descripcion: "Factura A — precio + IVA" },
  { id: "mono", nombre: "Monotributo", descripcion: "Factura C — precio con impuestos incluidos" },
  { id: "exento", nombre: "Exento", descripcion: "Sin cobro de IVA" },
  { id: "cf", nombre: "Consumidor Final", descripcion: "Persona física sin CUIT empresa" },
]

export default function ComercioPerfilPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [cuit, setCuit] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [tiposImpositivos, setTiposImpositivos] = useState<TipoImpositivo[]>(TIPOS_FALLBACK)
  const [form, setForm] = useState({
    nombre: "", telefono: "", direccion: "", ciudad: "", provincia: "",
    rubros: [] as string[], condicion_fiscal: "",
  })

  useEffect(() => {
    fetch(`${BACKEND_URL}/store/taxonomia`, { headers: { "x-publishable-api-key": PUB_KEY } })
      .then((r) => r.json())
      .then((data) => { if (data.tipos_impositivos?.length) setTiposImpositivos(data.tipos_impositivos) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }
    comerciosApi.getMe(token)
      .then((data) => {
        const c = data.comercio
        setEmail(c.email)
        setCuit(c.cuit || "")
        setForm({
          nombre: c.nombre || "", telefono: c.telefono || "", direccion: c.direccion || "",
          ciudad: c.ciudad || "", provincia: c.provincia || "", rubros: c.rubros || [],
          condicion_fiscal: c.condicion_fiscal || "",
        })
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("comercio_token"); router.replace("/comercio/login")
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const toggleRubro = (r: string) => {
    setForm((f) => ({
      ...f,
      rubros: f.rubros.includes(r) ? f.rubros.filter((x) => x !== r) : [...f.rubros, r],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.rubros.length === 0) { setError("Seleccioná al menos un tipo de comercio"); return }
    setError(""); setSaving(true); setSuccess(false)
    try {
      const token = localStorage.getItem("comercio_token")!
      await comerciosApi.updateMe(token, { ...form })
      setSuccess(true)
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
            <button onClick={() => router.push("/comercio/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Mi perfil</span>
          </div>
          <span className="text-sm text-gray-500">{email}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="text-sm text-gray-500 mt-1">Actualizá los datos de tu comercio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Datos del comercio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                <input value={cuit} disabled
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
                  {PROVINCIAS_ARGENTINA.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
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

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Tipo de comercio *</h2>
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

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">✓ Perfil actualizado</div>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/comercio/dashboard")}
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
