import { useState, useEffect } from "react"
import { Container, Heading, Button, Badge, Table, Text } from "@medusajs/ui"

const API = "/admin/api-keys"
const OPTS = { credentials: "include" as const }

type ApiKey = {
  id: string
  nombre: string
  tipo: "nexopos" | "mayorista"
  entidad_id: string
  activa: boolean
  webhook_url: string | null
  ultimo_uso: string | null
  created_at: string
  key_preview: string
}

const emptyForm = () => ({
  nombre: "",
  tipo: "nexopos" as "nexopos" | "mayorista",
  entidad_id: "",
  webhook_url: "",
})

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [keyGenerada, setKeyGenerada] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<"" | "nexopos" | "mayorista">("")

  const cargar = async () => {
    setLoading(true)
    try {
      const url = filtroTipo ? `${API}?tipo=${filtroTipo}` : API
      const r = await fetch(url, OPTS)
      const d = await r.json()
      setKeys(d.api_keys || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [filtroTipo])

  const crear = async () => {
    if (!form.nombre || !form.entidad_id) return alert("Nombre y entidad_id son requeridos")
    setSaving(true)
    try {
      const r = await fetch(API, {
        ...OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          tipo: form.tipo,
          entidad_id: form.entidad_id,
          webhook_url: form.webhook_url || null,
        }),
      })
      const d = await r.json()
      if (d.api_key) {
        setKeyGenerada(d.api_key.key)
        setShowForm(false)
        setForm(emptyForm())
        cargar()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleActiva = async (k: ApiKey) => {
    await fetch(`${API}/${k.id}`, {
      ...OPTS,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !k.activa }),
    })
    cargar()
  }

  const eliminar = async (k: ApiKey) => {
    if (!confirm(`¿Eliminar key "${k.nombre}"?`)) return
    await fetch(`${API}/${k.id}`, { ...OPTS, method: "DELETE" })
    cargar()
  }

  return (
    <Container>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Heading level="h1">API Keys</Heading>
        <Button onClick={() => { setShowForm(true); setKeyGenerada(null) }}>+ Nueva key</Button>
      </div>

      {/* Key recién generada */}
      {keyGenerada && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <Text weight="plus">⚠️ Guardá esta key ahora — no se vuelve a mostrar completa</Text>
          <div style={{ fontFamily: "monospace", fontSize: 14, wordBreak: "break-all", margin: "10px 0", background: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            {keyGenerada}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="small" onClick={() => navigator.clipboard.writeText(keyGenerada)}>Copiar</Button>
            <Button size="small" variant="secondary" onClick={() => setKeyGenerada(null)}>Cerrar</Button>
          </div>
        </div>
      )}

      {/* Formulario nueva key */}
      {showForm && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <Text weight="plus" style={{ marginBottom: 14, display: "block" }}>Nueva API Key</Text>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Nombre descriptivo *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="NexoPOS Almacén Don Juan"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
                <option value="nexopos">NexoPOS (comercio)</option>
                <option value="mayorista">Mayorista (ERP/WMS)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
                {form.tipo === "nexopos" ? "comercio_id *" : "mayorista_id *"}
              </label>
              <input value={form.entidad_id} onChange={e => setForm(f => ({ ...f, entidad_id: e.target.value }))}
                placeholder={form.tipo === "nexopos" ? "com_xxxx" : "may_xxxx"}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            {form.tipo === "mayorista" && (
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Webhook URL (opcional)</label>
                <input value={form.webhook_url} onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))}
                  placeholder="https://erp.ejemplo.com/webhooks/nexob2b"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={crear} disabled={saving}>{saving ? "Generando..." : "Generar key"}</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["", "nexopos", "mayorista"] as const).map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: filtroTipo === t ? "#1d4ed8" : "#f3f4f6",
              color: filtroTipo === t ? "#fff" : "#374151",
              borderColor: filtroTipo === t ? "#1d4ed8" : "#e5e7eb" }}>
            {t === "" ? "Todas" : t === "nexopos" ? "NexoPOS" : "Mayoristas"}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <Text>Cargando...</Text>
      ) : keys.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No hay API keys. Creá una con el botón de arriba.</div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Nombre</Table.HeaderCell>
              <Table.HeaderCell>Tipo</Table.HeaderCell>
              <Table.HeaderCell>Entidad ID</Table.HeaderCell>
              <Table.HeaderCell>Key</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Último uso</Table.HeaderCell>
              <Table.HeaderCell>Acciones</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {keys.map(k => (
              <Table.Row key={k.id}>
                <Table.Cell>
                  <Text weight="plus">{k.nombre}</Text>
                  {k.webhook_url && <Text size="small" style={{ color: "#6b7280" }}>🔗 {k.webhook_url.slice(0, 40)}...</Text>}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={k.tipo === "nexopos" ? "blue" : "green"}>
                    {k.tipo === "nexopos" ? "NexoPOS" : "Mayorista"}
                  </Badge>
                </Table.Cell>
                <Table.Cell><Text style={{ fontFamily: "monospace", fontSize: 12 }}>{k.entidad_id}</Text></Table.Cell>
                <Table.Cell><Text style={{ fontFamily: "monospace", fontSize: 12 }}>{k.key_preview}</Text></Table.Cell>
                <Table.Cell>
                  <Badge color={k.activa ? "green" : "red"}>{k.activa ? "Activa" : "Inactiva"}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" style={{ color: "#6b7280" }}>
                    {k.ultimo_uso ? new Date(k.ultimo_uso).toLocaleDateString("es-AR") : "Nunca"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button size="small" variant="secondary" onClick={() => toggleActiva(k)}>
                      {k.activa ? "Desactivar" : "Activar"}
                    </Button>
                    <Button size="small" variant="danger" onClick={() => eliminar(k)}>Eliminar</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}
