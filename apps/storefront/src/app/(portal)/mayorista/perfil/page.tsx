"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mayoristasApi, RUBROS_DISPONIBLES } from "../../../../lib/mayorista/api"

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
}

const PROVINCIAS = [
  "Buenos Aires","Ciudad Autónoma de Buenos Aires","Catamarca","Chaco","Chubut",
  "Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja",
  "Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis",
  "Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán",
]

export default function PerfilPage() {
  const router = useRouter()
  const [mayorista, setMayorista] = useState<Mayorista | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    nombre: "", telefono: "", direccion: "", ciudad: "", provincia: "", rubros: [] as string[],
  })

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
        })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.rubros.length === 0) { setError("Seleccioná al menos un rubro."); return }
    setError(""); setSaving(true); setSuccess(false)
    try {
      const token = localStorage.getItem("mayorista_token")!
      await mayoristasApi.updateMe(token, form)
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
            </div>
          </div>

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
