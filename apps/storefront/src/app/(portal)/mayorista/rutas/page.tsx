"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type Vendedor = { id: string; nombre: string; apellido: string }
type Comercio = { id: string; nombre: string; direccion?: string; ciudad?: string; lat?: number; lng?: number }
type Parada = Comercio & { orden: number }
type Ruta = {
  id: string; nombre: string; fecha: string; estado: string
  vendedor_id: string; paradas: { estado: string }[]
}

const ESTADO_RUTA: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: "Pendiente",   color: "#92400e", bg: "#fef3c7" },
  en_curso:    { label: "En curso",    color: "#1e40af", bg: "#dbeafe" },
  completada:  { label: "Completada",  color: "#065f46", bg: "#d1fae5" },
  cancelada:   { label: "Cancelada",   color: "#991b1b", bg: "#fee2e2" },
}

export default function RutasPage() {
  const router = useRouter()
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [comercios, setComercios] = useState<Comercio[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    vendedor_id: "",
    nombre: "",
    fecha: new Date().toISOString().slice(0, 10),
    notas: "",
  })
  const [paradas, setParadas] = useState<Parada[]>([])
  const [busquedaComercio, setBusquedaComercio] = useState("")

  const token = () => localStorage.getItem("mayorista_token") || ""
  const headers = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token()}`,
    "x-publishable-api-key": PUB_KEY,
  })

  const cargar = useCallback(async () => {
    const t = token()
    if (!t) { router.replace("/mayorista/login"); return }
    setLoading(true)
    try {
      const [rutasRes, vendRes, mapaRes] = await Promise.all([
        fetch(`${BACKEND_URL}/store/mayoristas/me/rutas`, { headers: headers() }),
        fetch(`${BACKEND_URL}/store/mayoristas/me/vendedores`, { headers: headers() }),
        fetch(`${BACKEND_URL}/store/mayoristas/me/mapa`, { headers: headers() }),
      ])
      const [rd, vd, md] = await Promise.all([rutasRes.json(), vendRes.json(), mapaRes.json()])
      setRutas(rd.rutas || [])
      setVendedores(vd.vendedores || [])
      setComercios(md.comercios || [])
    } catch { setError("Error al cargar datos") }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  const agregarParada = (c: Comercio) => {
    if (paradas.find(p => p.id === c.id)) return
    setParadas(prev => [...prev, { ...c, orden: prev.length + 1 }])
  }

  const quitarParada = (id: string) => {
    setParadas(prev => {
      const filtered = prev.filter(p => p.id !== id)
      return filtered.map((p, i) => ({ ...p, orden: i + 1 }))
    })
  }

  const moverParada = (idx: number, dir: -1 | 1) => {
    setParadas(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr.map((p, i) => ({ ...p, orden: i + 1 }))
    })
  }

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vendedor_id) { setError("Seleccioná un vendedor"); return }
    if (paradas.length === 0) { setError("Agregá al menos una parada"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/rutas`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          ...form,
          comercios: paradas.map(p => ({ comercio_id: p.id, orden: p.orden })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCreando(false)
      setForm({ vendedor_id: "", nombre: "", fecha: new Date().toISOString().slice(0, 10), notas: "" })
      setParadas([])
      cargar()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const comerciosFiltrados = comercios.filter(c =>
    c.nombre.toLowerCase().includes(busquedaComercio.toLowerCase()) ||
    (c.ciudad || "").toLowerCase().includes(busquedaComercio.toLowerCase())
  )

  const vendedorNombre = (id: string) => {
    const v = vendedores.find(v => v.id === id)
    return v ? `${v.nombre} ${v.apellido}` : "-"
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-bold text-gray-900 text-lg">🗺️ Rutas de campo</span>
          </div>
          <button
            onClick={() => { setCreando(true); setError("") }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + Nueva ruta
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* MODAL: Crear ruta */}
        {creando && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Nueva ruta de campo</h2>
                <button onClick={() => { setCreando(false); setError(""); setParadas([]) }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <form onSubmit={handleCrear} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor *</label>
                    <select required value={form.vendedor_id} onChange={e => setForm(f => ({ ...f, vendedor_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccioná un vendedor</option>
                      {vendedores.map(v => (
                        <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input type="date" required value={form.fecha}
                      onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la ruta *</label>
                    <input required value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ej: Zona Norte - Lunes"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                    <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                      rows={2} placeholder="Instrucciones para el vendedor..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>

                {/* Paradas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Izquierda: comercios disponibles */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Comercios disponibles</p>
                    <input
                      value={busquedaComercio}
                      onChange={e => setBusquedaComercio(e.target.value)}
                      placeholder="Buscar comercio..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="border border-gray-100 rounded-xl overflow-y-auto max-h-56 divide-y divide-gray-50">
                      {comerciosFiltrados.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Sin comercios</p>
                      ) : comerciosFiltrados.map(c => {
                        const yaAgregado = paradas.some(p => p.id === c.id)
                        return (
                          <div key={c.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                              {c.ciudad && <p className="text-xs text-gray-400">{c.ciudad}</p>}
                            </div>
                            <button type="button" onClick={() => agregarParada(c)} disabled={yaAgregado}
                              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${yaAgregado ? "text-gray-300 cursor-not-allowed" : "text-blue-600 hover:bg-blue-50"}`}>
                              {yaAgregado ? "✓" : "+ Agregar"}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Derecha: paradas ordenadas */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Paradas en orden <span className="text-gray-400 font-normal">({paradas.length})</span>
                    </p>
                    <div className="border border-gray-100 rounded-xl overflow-y-auto max-h-64 divide-y divide-gray-50">
                      {paradas.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">Agregá comercios desde la lista</p>
                      ) : paradas.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 px-3 py-2.5">
                          <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">{p.orden}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                            {p.ciudad && <p className="text-xs text-gray-400">{p.ciudad}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button type="button" onClick={() => moverParada(idx, -1)} disabled={idx === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1">↑</button>
                            <button type="button" onClick={() => moverParada(idx, 1)} disabled={idx === paradas.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1">↓</button>
                            <button type="button" onClick={() => quitarParada(p.id)}
                              className="text-red-400 hover:text-red-600 px-1">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setCreando(false); setParadas([]); setError("") }}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm">
                    {saving ? "Guardando..." : `Crear ruta (${paradas.length} paradas)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de rutas */}
        {rutas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🗺️</p>
            <p className="text-lg font-semibold text-gray-700">Sin rutas creadas</p>
            <p className="text-sm text-gray-400 mt-1">Creá una ruta para asignarle paradas a un vendedor</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rutas.map(r => {
              const e = ESTADO_RUTA[r.estado] || ESTADO_RUTA.pendiente
              const visitadas = r.paradas?.filter(p => p.estado === "visitado").length || 0
              const total = r.paradas?.length || 0
              const pct = total > 0 ? Math.round((visitadas / total) * 100) : 0
              return (
                <div key={r.id}
                  onClick={() => router.push(`/mayorista/rutas/${r.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{r.nombre}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: e.color, background: e.bg }}>
                          {e.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        📅 {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                        {" · "}
                        🧑‍💼 {vendedorNombre(r.vendedor_id)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{visitadas}/{total} paradas</p>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
