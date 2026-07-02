import { useState, useEffect } from "react"
import { Container, Heading, Button, Table, Text } from "@medusajs/ui"

const API = "/admin/transportes"
const OPTS = { credentials: "include" as const }

const TIPOS = [
  { value: "retiro",       label: "Retiro en depósito" },
  { value: "envio_propio", label: "Envío propio" },
  { value: "moto",         label: "Mensajería / Moto" },
  { value: "correo",       label: "Correo" },
  { value: "flete",        label: "Flete tercerizado" },
]

const INTEGRACION_TIPOS = [
  { value: "",          label: "Ninguna" },
  { value: "oca",       label: "OCA" },
  { value: "andreani",  label: "Andreani" },
  { value: "correo_ar", label: "Correo Argentino" },
  { value: "custom",    label: "API personalizada" },
]

const ICONOS_SUGERIDOS = ["🏭","🚚","🛵","📬","🚛","📦","🚐","🏍️","✈️","🚂"]

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
  integracion_config: Record<string, string> | null
}

const emptyForm = (): Partial<Transporte> => ({
  nombre: "", tipo: "envio_propio", descripcion: "",
  icono: "🚚", activo: true, orden: 0, porcentaje_costo: 0,
  tiene_seguimiento_propio: false,
  tracking_url_template: "", integracion_tipo: "", integracion_config: null,
})

export default function TransportesPage() {
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Transporte | null>(null)
  const [form, setForm] = useState<Partial<Transporte>>(emptyForm())
  const [configJson, setConfigJson] = useState("") // textarea para integracion_config
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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

  useEffect(() => { cargar() }, [])

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

    // Validar JSON de config si tiene contenido
    let configParsed: Record<string, string> | null = null
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">Transportes</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Gestioná transportes propios y terceros. Configurá integración de seguimiento cuando aplique.
          </Text>
        </div>
        <Button onClick={abrirCrear} size="small">+ Nuevo transporte</Button>
      </div>

      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
      )}

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
                    <span className="text-sm text-ui-fg-subtle">{tipoLabel(t.tipo)}</span>
                  </Table.Cell>
                  <Table.Cell>
                    {t.tiene_seguimiento_propio ? (
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
                      <button onClick={() => abrirEditar(t)}
                        className="text-xs text-blue-600 hover:underline">Editar</button>
                      <span className="text-ui-fg-muted">·</span>
                      <button onClick={() => eliminar(t)}
                        className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Container>
      )}

      {/* Modal crear / editar */}
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
                    placeholder="Ej: OCA"
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
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción (opcional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.descripcion || ""}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Entrega en 48hs zona GBA"
                />
              </div>

              {/* Orden + % Costo + Activo */}
              <div className="flex gap-4 items-end flex-wrap">
                <div className="w-28">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Orden</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.orden ?? 0}
                    onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))}
                  />
                </div>
                <div className="w-40">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">% Costo de envío</label>
                  <div className="relative">
                    <input
                      type="number" step="0.01" min="0" max="100"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.porcentaje_costo ?? 0}
                      onChange={e => setForm(f => ({ ...f, porcentaje_costo: Number(e.target.value) }))}
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-400">%</span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox" className="w-4 h-4 accent-blue-600"
                    checked={form.activo !== false}
                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Activo</span>
                </label>
              </div>

              {/* ── SECCIÓN INTEGRACIÓN ── */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Seguimiento / integración</p>

                <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 rounded-xl border border-gray-100 hover:border-blue-200 bg-gray-50">
                  <input
                    type="checkbox" className="w-4 h-4 accent-blue-600"
                    checked={!!form.tiene_seguimiento_propio}
                    onChange={e => setForm(f => ({ ...f, tiene_seguimiento_propio: e.target.checked }))}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Tiene seguimiento propio</p>
                    <p className="text-xs text-gray-500">Activá si el transporte tiene su propio sistema de tracking (OCA, Andreani, etc.)</p>
                  </div>
                </label>

                {form.tiene_seguimiento_propio && (
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

                    {/* URL de tracking */}
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

                    {/* Config JSON */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Credenciales API (JSON)
                        <span className="font-normal text-gray-400 ml-1">— opcional, para integración futura</span>
                      </label>
                      <textarea
                        rows={4}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={configJson}
                        onChange={e => setConfigJson(e.target.value)}
                        placeholder={'{\n  "cuit": "30-12345678-9",\n  "usuario": "nexob2b",\n  "password": "..."\n}'}
                      />
                      <p className="text-xs text-gray-400 mt-1">Los datos se guardan cifrados. Dejá vacío si no tenés credenciales aún.</p>
                    </div>
                  </div>
                )}

                {!form.tiene_seguimiento_propio && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
                    <span className="text-base">📦</span>
                    <p>Sin seguimiento propio: al despachar se generará una etiqueta con QR que lleva a la página de seguimiento de Nexo B2B, donde el transportista puede actualizar el estado.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={guardar} disabled={saving}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors">
                {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear transporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
