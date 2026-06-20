"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mayoristasApi, PROVINCIAS_ARGENTINA } from "../../../../../lib/mayorista/api"

export default function ZonaPage() {
  const router = useRouter()
  const [zonas, setZonas] = useState<string[]>([])
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }
    mayoristasApi.getMe(token)
      .then((data) => {
        setZonas(data.mayorista.zonas || [])
        setEmail(data.mayorista.email)
      })
      .catch(() => { localStorage.removeItem("mayorista_token"); router.replace("/mayorista/login") })
      .finally(() => setLoading(false))
  }, [router])

  const toggle = (p: string) => {
    setZonas((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess(false)
    try {
      const token = localStorage.getItem("mayorista_token")!
      await mayoristasApi.updateMe(token, { zonas })
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
            <span className="text-sm text-gray-500">Zona de influencia</span>
          </div>
          <span className="text-sm text-gray-500">{email}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Zona de influencia</h1>
          <p className="text-sm text-gray-500 mt-1">Seleccioná las provincias a las que llegás con tu distribución</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {zonas.length === 0
                ? "Sin provincias seleccionadas"
                : `${zonas.length} provincia${zonas.length !== 1 ? "s" : ""} seleccionada${zonas.length !== 1 ? "s" : ""}`}
            </p>
            {zonas.length > 0 && (
              <button onClick={() => setZonas([])} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                Limpiar selección
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PROVINCIAS_ARGENTINA.map((p) => (
              <button key={p} type="button" onClick={() => toggle(p)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  zonas.includes(p)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
            ✓ Zona de influencia actualizada
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={() => router.push("/mayorista/dashboard")}
            className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar zona"}
          </button>
        </div>
      </main>
    </div>
  )
}
