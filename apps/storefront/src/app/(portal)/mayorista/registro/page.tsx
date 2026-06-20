"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { mayoristasApi, RUBROS_DISPONIBLES, PROVINCIAS_ARGENTINA } from "../../../../lib/mayorista/api"

export default function RegistroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nombre: "",
    cuit: "",
    email: "",
    password: "",
    confirmPassword: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    rubros: [] as string[],
    zonas: [] as string[],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const toggleItem = (key: "rubros" | "zonas", value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    if (form.rubros.length === 0) {
      setError("Seleccioná al menos un rubro")
      return
    }

    setLoading(true)
    try {
      const { confirmPassword, ...payload } = form
      await mayoristasApi.registro(payload)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Registro exitoso!</h2>
          <p className="text-gray-500 mb-6">
            Tu cuenta está en revisión. Te avisaremos por email cuando sea aprobada.
          </p>
          <button
            onClick={() => router.push("/mayorista/login")}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nexo B2B</h1>
          <p className="text-gray-500 mt-1">Registro de Mayorista</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Datos de la empresa */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Datos de la empresa</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre / Razón social *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Distribuidora García S.A."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUIT *</label>
                  <input
                    type="text"
                    name="cuit"
                    required
                    value={form.cuit}
                    onChange={handleChange}
                    placeholder="20-12345678-9"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="0351-4123456"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder="Av. Colón 1234"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    name="ciudad"
                    value={form.ciudad}
                    onChange={handleChange}
                    placeholder="Córdoba"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                  <select
                    name="provincia"
                    value={form.provincia}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Seleccioná una provincia</option>
                    {PROVINCIAS_ARGENTINA.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Rubros */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Rubros *</h2>
              <p className="text-sm text-gray-500 mb-3">Seleccioná los rubros en los que operás</p>
              <div className="flex flex-wrap gap-2">
                {RUBROS_DISPONIBLES.map((rubro) => (
                  <button
                    key={rubro}
                    type="button"
                    onClick={() => toggleItem("rubros", rubro)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      form.rubros.includes(rubro)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {rubro}
                  </button>
                ))}
              </div>
            </div>

            {/* Zona de influencia */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Zona de influencia</h2>
              <p className="text-sm text-gray-500 mb-3">¿A qué provincias llegás con tu distribución?</p>
              <div className="flex flex-wrap gap-2">
                {PROVINCIAS_ARGENTINA.map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => toggleItem("zonas", prov)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      form.zonas.includes(prov)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>
            </div>

            {/* Credenciales */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Acceso al portal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="admin@distribuidora.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repetí la contraseña"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Solicitar alta como mayorista"}
            </button>

            <p className="text-center text-sm text-gray-500">
              ¿Ya tenés cuenta?{" "}
              <a href="/mayorista/login" className="text-blue-600 hover:underline font-medium">
                Ingresá acá
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
