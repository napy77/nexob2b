"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { productosApi, fileToBase64 } from "../../../../../lib/mayorista/api"

const UNIDADES = ["unidad", "kg", "g", "litro", "ml", "caja", "pack", "docena", "bolsa", "rollo"]
const PASILLOS_SUGERIDOS = [
  "Bebidas", "Alimentos secos", "Lácteos y frescos", "Limpieza",
  "Higiene personal", "Electrónica", "Indumentaria", "Ferretería", "Otros",
]
const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""

export default function EditarProductoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [imagenBase64, setImagenBase64] = useState<string | null>(null)
  const [imagenActual, setImagenActual] = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    unidad: "unidad",
    compra_minima: "1",
    stock: "",
    rubro: "",
    pasillo: "",
    activo: true,
  })

  useEffect(() => {
    const token = localStorage.getItem("mayorista_token")
    if (!token) { router.replace("/mayorista/login"); return }
    productosApi.obtener(token, id)
      .then((data) => {
        const p = data.producto
        setForm({
          nombre: p.nombre || "",
          descripcion: p.descripcion || "",
          precio: String(p.precio),
          unidad: p.unidad || "unidad",
          compra_minima: String(p.compra_minima ?? 1),
          stock: p.stock !== null && p.stock !== undefined ? String(p.stock) : "",
          rubro: p.rubro || "",
          pasillo: p.pasillo || "",
          activo: p.activo !== false,
        })
        setImagenActual(p.imagen_url || null)
      })
      .catch(() => { localStorage.removeItem("mayorista_token"); router.replace("/mayorista/login") })
      .finally(() => setLoading(false))
  }, [id, router])

  const setField = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("La imagen no puede superar los 5MB"); return }
    const b64 = await fileToBase64(file)
    setImagenBase64(b64)
    setImagenPreview(b64)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.precio || !form.unidad) {
      setError("Completá nombre, precio y unidad"); return
    }
    setError(""); setSaving(true); setSuccess(false)
    try {
      const token = localStorage.getItem("mayorista_token")!
      await productosApi.actualizar(token, id, {
        ...form,
        imagen_base64: imagenBase64,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      if (imagenBase64) setImagenActual(null) // se actualizó, ya no mostramos la vieja URL
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const imagenMostrar = imagenPreview ?? (imagenActual ? `${BACKEND_URL}${imagenActual}` : null)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/mayorista/productos")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Editar producto</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Editar producto</h1>
          <p className="text-sm text-gray-500 mt-1">{form.nombre}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Imagen */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Imagen del producto</h2>
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {imagenMostrar ? (
                  <img src={imagenMostrar} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">📦</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block">
                  <span className="sr-only">Cambiar imagen</span>
                  <input type="file" accept="image/*" onChange={handleImagen}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                </label>
                <p className="text-xs text-gray-400 mt-2">JPG, PNG o WebP. Máximo 5MB.</p>
                {imagenPreview && (
                  <button type="button" onClick={() => { setImagenPreview(null); setImagenBase64(null) }}
                    className="mt-2 text-xs text-red-500 hover:text-red-700">
                    Cancelar cambio de imagen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Datos principales */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Datos del producto</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600">Activo</span>
                <div
                  onClick={() => setField("activo", !form.activo)}
                  className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.activo ? "bg-blue-600" : "bg-gray-200"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activo ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={(e) => setField("nombre", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea value={form.descripcion} onChange={(e) => setField("descripcion", e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio * (ARS)</label>
                <input required type="number" min="0" step="0.01" value={form.precio} onChange={(e) => setField("precio", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
                <select value={form.unidad} onChange={(e) => setField("unidad", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compra mínima</label>
                <input type="number" min="1" value={form.compra_minima} onChange={(e) => setField("compra_minima", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock disponible</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => setField("stock", e.target.value)}
                  placeholder="Opcional"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Categorización */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Categorización</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
              <input value={form.rubro} onChange={(e) => setField("rubro", e.target.value)}
                placeholder="Ej: Bebidas alcohólicas"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pasillo</label>
              <input value={form.pasillo} onChange={(e) => setField("pasillo", e.target.value)}
                list="pasillos-list"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <datalist id="pasillos-list">
                {PASILLOS_SUGERIDOS.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
              ✓ Producto actualizado
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/mayorista/productos")}
              className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Volver
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
