"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, RUBROS_DISPONIBLES, PROVINCIAS_ARGENTINA } from "../../../../lib/comercio/api"

export default function ComercioRegistroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nombre: "", cuit: "", email: "", password: "", confirmPassword: "",
    telefono: "", direccion: "", ciudad: "", provincia: "", rubros: [] as string[],
  })

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const toggleRubro = (r: string) => {
    setForm((f) => ({
      ...f,
      rubros: f.rubros.includes(r) ? f.rubros.filter((x) => x !== r) : [...f.rubros, r],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError("Las contraseñas no coinciden"); return }
    if (form.rubros.length === 0) { setError("Seleccioná al menos un rubro"); return }
    setError(""); setLoading(true)
    try {
      await comerciosApi.registro({
        nombre: form.nombre, cuit: form.cuit, email: form.email, password: form.password,
        telefono: form.telefono, direccion: form.direccion, ciudad: form.ciudad,
        provincia: form.provincia, rubros: form.rubros,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Registro exitoso!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Tu solicitud está en revisión. Te avisaremos por email cuando tu cuenta sea aprobada.
        </p>
        <button onClick={() => router.push("/comercio/login")}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Ir al login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nexo B2B</h1>
          <p className="text-gray-500 mt-2">Registrá tu comercio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Datos del comercio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del comercio *</label>
                <input required value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Almacén El Sol, Kiosco Central..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT *</label>
                <input required value={form.cuit} onChange={(e) => set("cuit", e.target.value)}
                  placeholder="20-12345678-9"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)}
                  placeholder="Av. Corrientes 1234"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia *</label>
                <select required value={form.provincia} onChange={(e) => set("provincia", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccioná una provincia</option>
                  {PROVINCIAS_ARGENTINA.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Tipo de comercio *</h2>
            <p className="text-sm text-gray-400 mb-4">¿Qué tipo de negocio tenés?</p>
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

          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Acceso</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input required type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
                  minLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
                <input required type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
            {loading ? "Registrando..." : "Registrar comercio"}
          </button>

          <p className="text-center text-sm text-gray-500">
            ¿Ya tenés cuenta?{" "}
            <button type="button" onClick={() => router.push("/comercio/login")}
              className="text-blue-600 hover:underline font-medium">
              Iniciá sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
