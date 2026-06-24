"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type Vendedor = {
  id: string
  nombre: string
  apellido: string
  email: string | null
  celular: string | null
  activo: boolean
}

const EMPTY_FORM = { nombre: "", apellido: "", email: "", celular: "", password: "" }

export default function VendedoresPage() {
  const router = useRouter()
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [form, setForm] = useState(EMPTY_FORM)
  const [editando, setEditando] = useState<string | null>(null)  // id del que se está editando
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const token = () => localStorage.getItem("mayorista_token") || ""

  const headers = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token()}`,
    "x-publishable-api-key": PUB_KEY,
  })

  const cargar = async () => {
    const t = token()
    if (!t) { router.replace("/mayorista/login"); return }
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/vendedores`, { headers: headers() })
      const data = await res.json()
      setVendedores(data.vendedores || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const empezarEdicion = (v: Vendedor) => {
    setEditando(v.id)
    setForm({ nombre: v.nombre, apellido: v.apellido, email: v.email || "", celular: v.celular || "", password: "" })
    setFormError("")
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setForm(EMPTY_FORM)
    setFormError("")
  }

  const guardar = async () => {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setFormError("Nombre y apellido son obligatorios"); return
    }
    setSaving(true); setFormError("")
    try {
      const body: Record<string, any> = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim() || null,
        celular: form.celular.trim() || null,
      }
      if (form.password.trim()) body.password = form.password.trim()
      if (editando) {
        await fetch(`${BACKEND_URL}/store/mayoristas/me/vendedores/${editando}`, {
          method: "PUT", headers: headers(), body: JSON.stringify(body),
        })
      } else {
        await fetch(`${BACKEND_URL}/store/mayoristas/me/vendedores`, {
          method: "POST", headers: headers(), body: JSON.stringify(body),
        })
      }
      setForm(EMPTY_FORM)
      setEditando(null)
      await cargar()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este vendedor?")) return
    await fetch(`${BACKEND_URL}/store/mayoristas/me/vendedores/${id}`, {
      method: "DELETE", headers: headers(),
    })
    await cargar()
  }

  const toggleActivo = async (v: Vendedor) => {
    await fetch(`${BACKEND_URL}/store/mayoristas/me/vendedores/${v.id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ activo: !v.activo }),
    })
    await cargar()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-gray-900">Vendedores / Viajantes</span>
          {vendedores.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {vendedores.length}
            </span>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Formulario nuevo / edición */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            {editando ? "Editar vendedor" : "Agregar vendedor"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Juan"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido *</label>
              <input
                value={form.apellido}
                onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                placeholder="García"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Celular (WhatsApp)</label>
              <input
                value={form.celular}
                onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))}
                placeholder="+54 9 11 1234-5678"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="juan@empresa.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Contraseña para la app {editando && <span className="text-gray-400 font-normal">(dejá vacío para no cambiarla)</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editando ? "Nueva contraseña (opcional)" : "Contraseña de acceso a la app"}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {formError && <p className="text-xs text-red-600 mb-2">{formError}</p>}
          <div className="flex gap-2">
            <button
              onClick={guardar}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
              {saving ? "Guardando..." : editando ? "Guardar cambios" : "Agregar vendedor"}
            </button>
            {editando && (
              <button
                onClick={cancelarEdicion}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
        ) : vendedores.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl block mb-3">👤</span>
            <p className="text-gray-500 text-sm">Todavía no cargaste vendedores.</p>
            <p className="text-gray-400 text-xs mt-1">
              Sin vendedores, los comercios contactan directo al número de tu perfil.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {vendedores.map((v) => (
              <div key={v.id}
                className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-opacity ${
                  v.activo ? "border-gray-100" : "border-gray-100 opacity-60"
                }`}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-bold text-sm">
                    {v.nombre[0]}{v.apellido[0]}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    {v.nombre} {v.apellido}
                    {!v.activo && <span className="ml-2 text-xs text-gray-400 font-normal">(inactivo)</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {v.celular && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        {v.celular}
                      </span>
                    )}
                    {v.email && (
                      <span className="text-xs text-gray-500">{v.email}</span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActivo(v)}
                    title={v.activo ? "Desactivar" : "Activar"}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                    {v.activo
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                  <button
                    onClick={() => empezarEdicion(v)}
                    className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => eliminar(v.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {vendedores.length > 0 && (
          <p className="text-xs text-gray-400 text-center pb-4">
            Los comercios sin vendedor asignado contactan al número principal del perfil.
          </p>
        )}
      </main>
    </div>
  )
}
