import { useState, useEffect } from "react"
import { Container, Heading, Button, Table, Text } from "@medusajs/ui"

const API = "/admin/transportes"
const API_REGLAS = "/admin/nexoflex/reglas"
const OPTS = { credentials: "include" as const }

const TIPOS = [
  { value: "retiro",       label: "Retiro en depósito" },
  { value: "envio_propio", label: "Envío propio" },
  { value: "moto",         label: "Mensajería / Moto" },
  { value: "correo",       label: "Correo" },
  { value: "flete",        label: "Flete tercerizado" },
  { value: "nexoflex",     label: "🚀 NexoFlex (logística propia Nexo)" },
]

const INTEGRACION_TIPOS = [
  { value: "",          label: "Ninguna / QR interno" },
  { value: "oca",       label: "OCA" },
  { value: "andreani",  label: "Andreani" },
  { value: "correo_ar", label: "Correo Argentino" },
  { value: "cabify",    label: "🟣 Cabify Logistics" },
  { value: "custom",    label: "API personalizada" },
]

const CONDICIONES = [
  { value: "misma_ciudad",     label: "Misma ciudad que el mayorista" },
  { value: "misma_provincia",  label: "Misma provincia (distinta ciudad)" },
  { value: "distancia_km_lte", label: "Distancia ≤ X km" },
  { value: "distancia_km_gt",  label: "Distancia > X km" },
  { value: "siempre",          label: "Siempre (fallback / default)" },
]

const ICONOS_SUGERIDOS = ["🏭","🚚","🛵","📬","🚛","📦","🚐","🏍️","✈️","🚂","🟣","🚀"]

type Transporte = {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  icono: string | null
  activo: boolean
  orden: number
  porcentaje_costo: number
  tiene_seguimiento_propio: boolean
  tracking_url_template: string | null
  integracion_tipo: string | null
  integracion_config: Record<string, any> | null
}

type NexoflexRegla = {
  id: string
  orden: number
  nombre: string
  condicion: string
  condicion_valor: number | null
  transporte_id: string
  activo: boolean
  transporte?: { id: string; nombre: string; icono: string | null } | null
}

const emptyForm = (): Partial<Transporte> => ({
  nombre: "", tipo: "envio_propio", descripcion: "",
  icono: "🚚", activo: true, orden: 0, porcentaje_costo: 0,
  tiene_seguimiento_propio: false,
  tracking_url_template: "", integracion_tipo: "", integracion_config: null,
})

const emptyRegla = (): Partial<NexoflexRegla> => ({
  nombre: "", condicion: "misma_ciudad", condicion_valor: null,
  transporte_id: "", orden: 0, activo: true,
})

export default function TransportesPage() {
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Transporte | null>(null)
  const [form, setForm] = useState<Partial<Transporte>>(emptyForm())
  const [configJson, setConfigJson] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // NexoFlex reglas
  const [reglas, setReglas] = useState<NexoflexRegla[]>([])
  const [showReglaModal, setShowReglaModal] = useState(false)
  const [editandoRegla, setEditandoRegla] = useState<NexoflexRegla | null>(null)
  const [formRegla, setFormRegla] = useState<Partial<NexoflexRegla>>(emptyRegla())
  const [savingRegla, setSavingRegla] = useState(false)
  const [showNexoflex, setShowNexoflex] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await fetch(API, OPTS)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`)
      setTransportes(data.transportes || [])
    } catch (e: any) { setError(`Error al cargar: ${e.message}`) }
    finally { setLoading(false) }
  }

  const cargarReglas = async () => {
    try {
      const res = await fetch(API_REGLAS, OPTS)
      const data = await res.json()
      setReglas(data.reglas || [])
    } catch {}
  }

  useEffect(() => { cargar(); cargarReglas() }, [])

  // ── TRANSPORTES ──────────────────────────────────────────────────────────

  const abrirCrear = () => {
    setEditando(null)
    setForm({ ...emptyForm(), orden: (transportes.length + 1) * 10 })
    setConfigJson("")
    setError("")
    setShowModal(true)
  }

  const abrirEditar = (t: Transporte) => {
    setEditando(t)
    setForm({ ...t, porcentaje_costo: t.porcentaje_costo ?? 0 })
    setConfigJson(t.integracion_config ? JSON.stringify(t.integracion_config, null, 2) : "")
    setError("")
    setShowModal(true)
  }

  const toggleActivo = async (t: Transporte) => {
    try {
      await fetch(`${API}/${t.id}`, {
        ...OPTS, method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !t.activo }),
      })
      await cargar()
    } catch { setError("Error al actualizar") }
  }

  const eliminar = async (t: Transporte) => {
    if (!confirm(`¿Eliminar "${t.nombre}"?`)) return
    try {
      await fetch(`${API}/${t.id}`, { ...OPTS, method: "DELETE" })
      await cargar()
    } catch { setError("Error al eliminar") }
  }

  const guardar = async () => {
    if (!form.nombre?.trim()) { setError("El nombre es requerido"); return }
    let configParsed: Record<string, any> | null = null
    if (configJson.trim()) {
      try { configParsed = JSON.parse(configJson) }
      catch { setError("El JSON de configuración no es válido"); return }
    }
    setSaving(true); setError("")
    try {
      const body = {
        nombre: form.nombre,
        tipo: form.tipo,
        descripcion: form.descripcion || null,
        icono: form.icono || null,
        activo: form.activo,
        orden: Number(form.orden) || 0,
        porcentaje_costo: Number(form.porcentaje_costo) || 0,
        tiene_seguimiento_propio: !!form.tiene_seguimiento_propio,
        tracking_url_template: form.tracking_url_template?.trim() || null,
        integracion_tipo: form.integracion_tipo?.trim() || null,
        integracion_config: configParsed,
      }
      const url = editando ? `${API}/${editando.id}` : API
      const method = editando ? "PUT" : "POST"
      const res = await fetch(url, {
        ...OPTS, method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error") }
      setShowModal(false)
      await cargar()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const tipoLabel = (t: string) => TIPOS.find(x => x.value === t)?.label || t

  // ── NEXOFLEX REGLAS ───────────────────────────────────────────────────────

  const abrirCrearRegla = () => {
    setEditandoRegla(null)
    setFormRegla({ ...emptyRegla(), orden: (reglas.length + 1) * 10 })
    setShowReglaModal(true)
  }

  const abrirEditarRegla = (r: NexoflexRegla) => {
    setEditandoRegla(r)
    setFormRegla({ ...r })
    setShowReglaModal(true)
  }

  const guardarRegla = async () => {
    if (!formRegla.nombre?.trim()) return
    if (!formRegla.transporte_id) return
    setSavingRegla(true)
    try {
      const body = {
        nombre: formRegla.nombre,
        condicion: formRegla.condicion,
        condicion_valor: formRegla.condicion_valor ?? null,
        transporte_id: formRegla.transporte_id,
        orden: Number(formRegla.orden) || 0,
        activo: formRegla.activo !== false,
      }
      const url = editandoRegla ? `${API_REGLAS}/${editandoRegla.id}` : API_REGLAS
      const method = editandoRegla ? "PUT" : "POST"
      const res = await fetch(url, {
        ...OPTS, method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error") }
      setShowReglaModal(false)
      await cargarReglas()
    } catch (e: any) { setError(e.message) }
    finally { setSavingRegla(false) }
  }

  const eliminarRegla = async (r: NexoflexRegla) => {
    if (!confirm(`¿Eliminar regla "${r.nombre}"?`)) return
    await fetch(`${API_REGLAS}/${r.id}`, { ...OPTS, method: "DELETE" })
    await cargarReglas()
  }

  const toggleReglaActiva = async (r: NexoflexRegla) => {
    await fetch(`${API_REGLAS}/${r.id}`, {
      ...OPTS, method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !r.activo }),
    })
    await cargarReglas()
  }

  const condicionLabel = (c: string) => CONDICIONES.find(x => x.value === c)?.label || c
  const requiereValor = (c: string) => c === "distancia_km_lte" || c === "distancia_km_gt"

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Transportes</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Transportes propios, tercerizados y NexoFlex. Configurá integración de seguimiento cuando aplique.
          </Text>
        </div>
        <Button onClick={abrirCrear} size="small">+ Nuevo transporte</Button>
      </div>

      {error && !showModal && !showReglaModal && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── TABLA TRANSPORTES ── */}
      {loading ? (
        <div className="text-center py-12 text-ui-fg-subtle">Cargando...</div>
      ) : (
        <Container className="p-0 overflow-hidden">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Transporte</Table.HeaderCell>
                <Table.HeaderCell>Tipo</Table.HeaderCell>
                <Table.HeaderCell>Seguimiento</Table.HeaderCell>
                <Table.HeaderCell>% Costo</Table.HeaderCell>
                <Table.HeaderCell>Estado</Table.HeaderCell>
                <Table.HeaderCell>Acciones</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {transportes.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={6} className="text-center py-8 text-ui-fg-subtle">
                    No hay tipos de transporte registrados
                  </Table.Cell>
                </Table.Row>
              )}
              {transportes.map(t => (
                <Table.Row key={t.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.icono || "🚚"}</span>
                      <div>
                        <p className="font-medium text-sm">{t.nombre}</p>
                        {t.descripcion && <p className="text-xs text-ui-fg-subtle">{t.descripcion}</p>}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.tipo === "nexoflex"
                        ? "bg-purple-100 text-purple-700"
                        : "text-ui-fg-subtle"
                    }`}>{tipoLabel(t.tipo)}</span>
                  </Table.Cell>
                  <Table.Cell>
                    {t.integracion_tipo === "cabify" ? (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                        🟣 Cabify
                      </span>
                    ) : t.tiene_seguimiento_propio ? (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        🔗 {t.integracion_tipo ? t.integracion_tipo.toUpperCase() : "Propio"}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                        📦 QR interno
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm font-medium text-gray-700">
                      {Number(t.porcentaje_costo) > 0
                        ? `${Number(t.porcentaje_costo)}%`
                        : <span className="text-ui-fg-muted">—</span>
                      }
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <button
                      onClick={() => toggleActivo(t)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                        t.activo
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}>
                      {t.activo ? "✓ Activo" : "Inactivo"}
                    </button>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirEditar(t)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      <span className="text-ui-fg-muted">·</span>
                      <button onClick={() => eliminar(t)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Container>
      )}

      {/* ── SECCIÓN NEXOFLEX ── */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-5 hover:bg-purple-50/50 transition-colors"
          onClick={() => setShowNexoflex(v => !v)}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div className="text-left">
              <p className="font-bold text-gray-900">NexoFlex — Motor de despacho</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Reglas para decidir automáticamente qué transporte usar según destino, distancia o ciudad.
                {reglas.length > 0 && ` ${reglas.filter(r => r.activo).length} regla${reglas.filter(r => r.activo).length !== 1 ? "s" : ""} activa${reglas.filter(r => r.activo).length !== 1 ? "s" : ""}.`}
              </p>
            </div>
          </div>
          <span className="text-gray-400 text-sm">{showNexoflex ? "▲" : "▼"}</span>
        </button>

        {showNexoflex && (
          <div className="border-t border-purple-100 p-5 space-y-4">

            {/* Intro */}
            <div className="bg-white rounded-xl border border-purple-100 p-4 text-sm text-gray-700">
              <p className="font-semibold mb-2">¿Cómo funciona?</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                NexoFlex colecta la mercadería en el mayorista con transporte propio, y para la última milla
                evalúa las reglas en orden (de menor a mayor número de orden) y aplica la primera que matchea.
                Configurá <strong>Cabify</strong> para envíos en la misma ciudad, <strong>OCA/Andreani</strong>
                para el interior, y un transporte propio como fallback.
              </p>
            </div>

            {/* Tabla de reglas */}
            <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-800">Reglas de despacho</p>
                <button
                  onClick={abrirCrearRegla}
                  className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-purple-700">
                  + Nueva regla
                </button>
              </div>

              {reglas.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No hay reglas configuradas. Agregá la primera para activar NexoFlex.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Orden</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Regla</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Condición</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Usa transporte</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Estado</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...reglas].sort((a, b) => a.orden - b.orden).map((r, idx) => (
                      <tr key={r.id} className={`border-b border-gray-50 last:border-0 ${!r.activo ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-800">{r.nombre}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            {condicionLabel(r.condicion)}
                            {r.condicion_valor != null && ` (${r.condicion_valor} km)`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.transporte ? (
                            <span className="text-sm text-gray-700">
                              {r.transporte.icono} {r.transporte.nombre}
                            </span>
                          ) : (
                            <span className="text-xs text-red-500">⚠ Transporte no encontrado</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleReglaActiva(r)}
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              r.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                            }`}>
                            {r.activo ? "✓ Activa" : "Inactiva"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => abrirEditarRegla(r)} className="text-xs text-blue-600 hover:underline">Editar</button>
                            <span className="text-gray-300">·</span>
                            <button onClick={() => eliminarRegla(r)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Ayuda Cabify */}
            <div className="bg-purple-600/5 border border-purple-100 rounded-xl p-4 text-xs text-gray-600">
              <p className="font-semibold text-purple-700 mb-1">💡 Para usar Cabify como última milla</p>
              <p>Creá un transporte con <strong>Tipo: Envío propio</strong> e <strong>Integración: Cabify Logistics</strong>,
              ingresando tu API Key en el campo de credenciales. Luego referencialó en la regla "Misma ciudad".</p>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL TRANSPORTE ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {editando ? "Editar transporte" : "Nuevo transporte"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

              {/* Nombre + Icono */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre *</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.nombre || ""}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Cabify Ciudad"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ícono</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.icono || ""}
                    onChange={e => setForm(f => ({ ...f, icono: e.target.value }))}
                    placeholder="🚚"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ICONOS_SUGERIDOS.map(ic => (
                      <button key={ic} onClick={() => setForm(f => ({ ...f, icono: ic }))}
                        className={`text-sm px-1 rounded hover:bg-gray-100 ${form.icono === ic ? "bg-blue-100" : ""}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.tipo || "envio_propio"}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {form.tipo === "nexoflex" && (
                  <p className="text-xs text-purple-600 mt-1">
                    🚀 NexoFlex activa el motor de reglas de despacho. Configurá las reglas en el panel inferior.
                  </p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción (opcional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.descripcion || ""}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Entrega el mismo día en CABA"
                />
              </div>

              {/* Orden + % Costo + Activo */}
              <div className="flex gap-4 items-end flex-wrap">
                <div className="w-28">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Orden</label>
                  <input type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.orden ?? 0}
                    onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))}
                  />
                </div>
                <div className="w-40">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">% Costo de envío</label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" max="100"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.porcentaje_costo ?? 0}
                      onChange={e => setForm(f => ({ ...f, porcentaje_costo: Number(e.target.value) }))}
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-400">%</span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600"
                    checked={form.activo !== false}
                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Activo</span>
                </label>
              </div>

              {/* ── INTEGRACIÓN ── */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Seguimiento / integración</p>

                {form.tipo !== "nexoflex" && (
                  <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 rounded-xl border border-gray-100 hover:border-blue-200 bg-gray-50">
                    <input type="checkbox" className="w-4 h-4 accent-blue-600"
                      checked={!!form.tiene_seguimiento_propio}
                      onChange={e => setForm(f => ({ ...f, tiene_seguimiento_propio: e.target.checked }))}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Tiene seguimiento propio</p>
                      <p className="text-xs text-gray-500">Activá si el transporte tiene su propio sistema de tracking</p>
                    </div>
                  </label>
                )}

                {(form.tiene_seguimiento_propio || form.tipo === "nexoflex") && (
                  <div className="space-y-3 pl-1">
                    {/* Tipo de integración */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de integración</label>
                      <select
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.integracion_tipo || ""}
                        onChange={e => setForm(f => ({ ...f, integracion_tipo: e.target.value }))}>
                        {INTEGRACION_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>

                    {/* URL de tracking (no para Cabify que lo gestiona automáticamente) */}
                    {form.integracion_tipo !== "cabify" && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          URL de seguimiento
                          <span className="font-normal text-gray-400 ml-1">— usá {"{numero_guia}"} como placeholder</span>
                        </label>
                        <input
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.tracking_url_template || ""}
                          onChange={e => setForm(f => ({ ...f, tracking_url_template: e.target.value }))}
                          placeholder="https://oca.com.ar/seguimiento?numero={numero_guia}"
                        />
                      </div>
                    )}

                    {/* Config JSON */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        {form.integracion_tipo === "cabify"
                          ? "Credenciales Cabify Logistics"
                          : "Credenciales API (JSON)"}
                        <span className="font-normal text-gray-400 ml-1">— se guardan cifradas</span>
                      </label>
                      {form.integracion_tipo === "cabify" ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-0.5">API Key *</label>
                            <input
                              type="password"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400"
                              placeholder="Bearer token de Cabify Logistics"
                              value={(() => { try { return JSON.parse(configJson || "{}").api_key || "" } catch { return "" } })()}
                              onChange={e => {
                                try {
                                  const c = JSON.parse(configJson || "{}")
                                  setConfigJson(JSON.stringify({ ...c, api_key: e.target.value }, null, 2))
                                } catch {
                                  setConfigJson(JSON.stringify({ api_key: e.target.value }, null, 2))
                                }
                              }}
                            />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                            <input type="checkbox"
                              className="accent-purple-600"
                              checked={(() => { try { return JSON.parse(configJson || "{}").sandbox === true } catch { return false } })()}
                              onChange={e => {
                                try {
                                  const c = JSON.parse(configJson || "{}")
                                  setConfigJson(JSON.stringify({ ...c, sandbox: e.target.checked }, null, 2))
                                } catch {
                                  setConfigJson(JSON.stringify({ sandbox: e.target.checked }, null, 2))
                                }
                              }}
                            />
                            Usar Sandbox (pruebas — no genera envíos reales)
                          </label>
                          <p className="text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-2">
                            🟣 Con Cabify: el tracking lo maneja Cabify automáticamente y notifica al destinatario.
                            No necesitás URL de tracking manual.
                          </p>
                        </div>
                      ) : (
                        <textarea rows={4}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          value={configJson}
                          onChange={e => setConfigJson(e.target.value)}
                          placeholder={'{\n  "cuit": "30-12345678-9",\n  "usuario": "nexob2b",\n  "password": "..."\n}'}
                        />
                      )}
                    </div>
                  </div>
                )}

                {!form.tiene_seguimiento_propio && form.tipo !== "nexoflex" && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
                    <span className="text-base">📦</span>
                    <p>Sin seguimiento propio: al despachar se generará una etiqueta con QR que lleva a la página de seguimiento de Nexo B2B.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={guardar} disabled={saving}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors">
                {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear transporte"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REGLA NEXOFLEX ── */}
      {showReglaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {editandoRegla ? "Editar regla NexoFlex" : "Nueva regla NexoFlex"}
              </h2>
              <button onClick={() => setShowReglaModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre de la regla *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formRegla.nombre || ""}
                  onChange={e => setFormRegla(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Misma ciudad → Cabify"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Condición *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formRegla.condicion || "misma_ciudad"}
                  onChange={e => setFormRegla(f => ({ ...f, condicion: e.target.value, condicion_valor: null }))}>
                  {CONDICIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {requiereValor(formRegla.condicion || "") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Distancia en km *
                    <span className="font-normal text-gray-400 ml-1">
                      {formRegla.condicion === "distancia_km_lte" ? "(≤ este valor)" : "(> este valor)"}
                    </span>
                  </label>
                  <input type="number" min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={formRegla.condicion_valor ?? ""}
                    onChange={e => setFormRegla(f => ({ ...f, condicion_valor: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="50"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Transporte a usar *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formRegla.transporte_id || ""}
                  onChange={e => setFormRegla(f => ({ ...f, transporte_id: e.target.value }))}>
                  <option value="">— Seleccioná un transporte —</option>
                  {transportes.filter(t => t.tipo !== "nexoflex").map(t => (
                    <option key={t.id} value={t.id}>
                      {t.icono} {t.nombre}
                      {t.integracion_tipo === "cabify" ? " (Cabify)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Solo se muestran transportes no-NexoFlex para evitar recursión.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-28">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Orden de evaluación</label>
                  <input type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={formRegla.orden ?? 0}
                    onChange={e => setFormRegla(f => ({ ...f, orden: Number(e.target.value) }))}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input type="checkbox" className="w-4 h-4 accent-purple-600"
                    checked={formRegla.activo !== false}
                    onChange={e => setFormRegla(f => ({ ...f, activo: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Regla activa</span>
                </label>
              </div>

              {formRegla.condicion === "siempre" && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                  ⚠️ La condición <strong>Siempre</strong> actúa como fallback. Poné el número de orden más alto para que se evalúe última.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowReglaModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={guardarRegla} disabled={savingRegla || !formRegla.nombre || !formRegla.transporte_id}
                className="px-5 py-2 bg-purple-700 text-white text-sm font-semibold rounded-lg hover:bg-purple-800 disabled:opacity-60 transition-colors">
                {savingRegla ? "Guardando..." : editandoRegla ? "Guardar cambios" : "Crear regla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
