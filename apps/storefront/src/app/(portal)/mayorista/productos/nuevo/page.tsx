"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { productosApi, fileToBase64 } from "../../../../../lib/mayorista/api"

const UNIDADES = ["unidad", "kg", "g", "litro", "ml", "caja", "pack", "docena", "bolsa", "rollo"]
const PASILLOS_SUGERIDOS = [
  "Bebidas", "Alimentos secos", "Lácteos y frescos", "Limpieza",
  "Higiene personal", "Electrónica", "Indumentaria", "Ferretería", "Otros",
]

export default function NuevoProductoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [imagenBase64, setImagenBase64] = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    unidad: "unidad",
    compra_minima: "1",
    stock: "",
    rubro: "",
    pasillo: "",
  })

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

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
    setError(""); setSaving(true)
    try {
      const token = localStorage.getItem("mayorista_token")!
      await productosApi.crear(token, {
        ...form,
        imagen_base64: imagenBase64,
      })
      router.push("/mayorista/productos")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

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
          <span className="text-sm text-gray-500">Nuevo producto</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nuevo producto</h1>
          <p className="text-sm text-gray-500 mt-1">Completá los datos del producto para tu catálogo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Imagen */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Imagen del producto</h2>
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {imagenPreview ? (
                  <img src={imagenPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">📦</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block">
                  <span className="sr-only">Seleccionar imagen</span>
                  <input type="file" accept="image/*" onChange={handleImagen}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                </label>
                <p className="text-xs text-gray-400 mt-2">JPG, PNG o WebP. Máximo 5MB.</p>
                {imagenPreview && (
                  <button type="button" onClick={() => { setImagenPreview(null); setImagenBase64(null) }}
                    className="mt-2 text-xs text-red-500 hover:text-red-700">
                    Quitar imagen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Datos principales */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Datos del producto</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
                placeholder="Ej: Vino Malbec Reserve"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)}
                rows={3} placeholder="Describí el producto, presentación, características..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio * (ARS)</label>
                <input required type="number" min="0" step="0.01" value={form.precio} onChange={(e) => set("precio", e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
                <select value={form.unidad} onChange={(e) => set("unidad", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compra mínima</label>
                <input type="number" min="1" value={form.compra_minima} onChange={(e) => set("compra_minima", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Ej: 6 para vino (caja de 6)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock disponible</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)}
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
              <input value={form.rubro} onChange={(e) => set("rubro", e.target.value)}
                placeholder="Ej: Bebidas alcohólicas, Limpieza del hogar..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pasillo</label>
              <input value={form.pasillo} onChange={(e) => set("pasillo", e.target.value)}
                list="pasillos-list"
                placeholder="Ej: Bebidas, Limpieza, Lácteos..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <datalist id="pasillos-list">
                {PASILLOS_SUGERIDOS.map((p) => <option key={p} value={p} />)}
              </datalist>
              <p className="text-xs text-gray-400 mt-1">Agrupa tus productos como pasillos de supermercado</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/mayorista/productos")}
              className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {saving ? "Guardando..." : "Publicar producto"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
