"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type Codigo = {
  id: string
  codigo: string
  tipo: "porcentaje" | "fijo"
  valor: number
  uso_maximo: number | null
  usos_actuales: number
  fecha_vencimiento: string | null
  activo: boolean
  created_at: string
}

const TIPO_LABELS = { porcentaje: "% descuento", fijo: "$ monto fijo" }

export default function CodigosDescuentoPage() {
  const router = useRouter()
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Codigo | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const [formCodigo, setFormCodigo] = useState("")
  const [formTipo, setFormTipo] = useState<"porcentaje" | "fijo">("porcentaje")
  const [formValor, setFormValor] = useState("")
  const [formUsoMaximo, setFormUsoMaximo] = useState("")
  const [formFechaVenc, setFormFechaVenc] = useState("")

  const token = () => localStorage.getItem("mayorista_token") || ""
  const headers = (ct = true) => ({
    ...(ct ? { "Content-Type": "application/json" } : {}),
    "Authorization": `Bearer ${token()}`,
    "x-publishable-api-key": PUB_KEY,
  })

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/codigos-descuento`, { headers: headers(false) })
      if (res.status === 401) { router.replace("/mayorista/login"); return }
      const data = await res.json()
      setCodigos(data.codigos || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const abrirCrear = () => {
    setEditando(null)
    setFormCodigo(""); setFormTipo("porcentaje"); setFormValor(""); setFormUsoMaximo(""); setFormFechaVenc("")
    setModal(true)
  }

  const abrirEditar = (c: Codigo) => {
    setEditando(c)
    setFormCodigo(c.codigo)
    setFormTipo(c.tipo)
    setFormValor(String(c.valor))
    setFormUsoMaximo(c.uso_maximo != null ? String(c.uso_maximo) : "")
    setFormFechaVenc(c.fecha_vencimiento ? c.fecha_vencimiento.slice(0, 10) : "")
    setModal(true)
  }

  const guardar = async () => {
    if (!formCodigo.trim() || !formValor) return
    setGuardando(true)
    try {
      const body = {
        codigo: formCodigo.trim(),
        tipo: formTipo,
        valor: parseFloat(formValor),
        uso_maximo: formUsoMaximo ? parseInt(formUsoMaximo) : null,
        fecha_vencimiento: formFechaVenc || null,
      }
      const url = editando
        ? `${BACKEND_URL}/store/mayoristas/me/codigos-descuento/${editando.id}`
        : `${BACKEND_URL}/store/mayoristas/me/codigos-descuento`
      const res = await fetch(url, { method: editando ? "PUT" : "POST", headers: headers(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal(false)
      cargar()
    } catch (e: any) { alert(e.message) }
    finally { setGuardando(false) }
  }

  const toggleActivo = async (c: Codigo) => {
    try {
      await fetch(`${BACKEND_URL}/store/mayoristas/me/codigos-descuento/${c.id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ activo: !c.activo }),
      })
      setCodigos((prev) => prev.map((x) => x.id === c.id ? { ...x, activo: !x.activo } : x))
    } catch (e: any) { alert(e.message) }
  }

  const eliminar = async (c: Codigo) => {
    if (!confirm(`¿Eliminar el código "${c.codigo}"?`)) return
    setEliminando(c.id)
    try {
      await fetch(`${BACKEND_URL}/store/mayoristas/me/codigos-descuento/${c.id}`, {
        method: "DELETE", headers: headers(false),
      })
      setCodigos((prev) => prev.filter((x) => x.id !== c.id))
    } catch (e: any) { alert(e.message) }
    finally { setEliminando(null) }
  }

  const estaVencido = (c: Codigo) =>
    c.fecha_vencimiento ? new Date(c.fecha_vencimiento) < new Date() : false
  const estaAgotado = (c: Codigo) =>
    c.uso_maximo !== null && c.usos_actuales >= c.uso_maximo

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Códigos de descuento</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Códigos de descuento</h1>
            <p className="text-sm text-gray-500 mt-0.5">Los comercios los ingresan en el carrito al hacer el pedido</p>
          </div>
          <button onClick={abrirCrear}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nuevo código
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
        ) : codigos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">🎟️</div>
            <h3 className="font-semibold text-gray-800 mb-2">No tenés códigos de descuento</h3>
            <p className="text-gray-500 text-sm mb-6">Creá códigos para que tus comercios obtengan descuentos en sus pedidos</p>
            <button onClick={abrirCrear}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              Crear primer código
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {codigos.map((c) => {
              const vencido = estaVencido(c)
              const agotado = estaAgotado(c)
              const inactivo = !c.activo || vencido || agotado

              return (
                <div key={c.id} className={`bg-white rounded-2xl border p-5 ${inactivo ? "border-gray-100 opacity-75" : "border-gray-100"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-900 text-base tracking-wide bg-gray-100 px-2 py-0.5 rounded">
                          {c.codigo}
                        </span>
                        <span className="text-sm font-semibold text-blue-700">
                          {c.tipo === "porcentaje" ? `${c.valor}% OFF` : `$${c.valor.toLocaleString("es-AR")} OFF`}
                        </span>
                        {vencido && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Vencido</span>}
                        {agotado && !vencido && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Agotado</span>}
                        {!inactivo && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activo</span>}
                        {!c.activo && !vencido && !agotado && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Pausado</span>}
                      </div>

                      <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        <span>{c.usos_actuales} uso{c.usos_actuales !== 1 ? "s" : ""}{c.uso_maximo != null ? ` / ${c.uso_maximo}` : " (ilimitado)"}</span>
                        {c.fecha_vencimiento && (
                          <span>Vence: {new Date(c.fecha_vencimiento).toLocaleDateString("es-AR")}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle activo/pausado */}
                      {!vencido && !agotado && (
                        <button
                          onClick={() => toggleActivo(c)}
                          title={c.activo ? "Pausar" : "Activar"}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${c.activo ? "bg-green-500" : "bg-gray-200"}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${c.activo ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      )}
                      <button onClick={() => abrirEditar(c)}
                        className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                        Editar
                      </button>
                      <button onClick={() => eliminar(c)}
                        disabled={eliminando === c.id}
                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-60">
                        {eliminando === c.id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── MODAL CREAR/EDITAR ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-5">
              {editando ? "Editar código" : "Nuevo código de descuento"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                  placeholder="VERANO25, BIENVENIDO, etc."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="porcentaje">% porcentaje</option>
                    <option value="fijo">$ monto fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor {formTipo === "porcentaje" ? "(%)" : "($)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={formTipo === "porcentaje" ? "100" : undefined}
                    step="0.01"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    placeholder={formTipo === "porcentaje" ? "10" : "500"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usos máximos</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formUsoMaximo}
                    onChange={(e) => setFormUsoMaximo(e.target.value)}
                    placeholder="Ilimitado"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Vacío = ilimitado · 1 = uso único</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                  <input
                    type="date"
                    value={formFechaVenc}
                    onChange={(e) => setFormFechaVenc(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Vacío = sin vencimiento</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar}
                disabled={guardando || !formCodigo.trim() || !formValor}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear código"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
