import { useState, useEffect } from "react"

type Tab = "smtp" | "mp" | "apikeys"

// ─── helpers de estilo compartidos ────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8,
  fontSize: 14, color: "#111827", width: "100%", boxSizing: "border-box", outline: "none",
}
const btnPrimary: React.CSSProperties = {
  padding: "10px 20px", background: "#2563eb", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  alignSelf: "flex-start",
}

function Msg({ msg }: { msg: { type: "ok" | "error"; text: string } }) {
  return (
    <div style={{
      padding: "12px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500,
      background: msg.type === "ok" ? "#d1fae5" : "#fee2e2",
      color: msg.type === "ok" ? "#065f46" : "#991b1b",
    }}>
      {msg.type === "ok" ? "✅ " : "❌ "}{msg.text}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Subcomponente API Keys ────────────────────────────────────────────────────
type ApiKey = {
  id: string
  nombre: string
  tipo: "nexopos" | "mayorista"
  entidad_id: string
  activa: boolean
  webhook_url: string | null
  ultimo_uso: string | null
  key_preview: string
}
const emptyApiForm = () => ({ nombre: "", tipo: "nexopos" as "nexopos" | "mayorista", entidad_id: "", webhook_url: "" })
const OPTS = { credentials: "include" as const }

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyApiForm())
  const [saving, setSaving] = useState(false)
  const [keyGenerada, setKeyGenerada] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<"" | "nexopos" | "mayorista">("")

  const cargar = async () => {
    setLoading(true)
    try {
      const url = filtro ? `/admin/api-keys?tipo=${filtro}` : "/admin/api-keys"
      const r = await fetch(url, OPTS)
      const d = await r.json()
      setKeys(d.api_keys || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [filtro])

  const crear = async () => {
    if (!form.nombre || !form.entidad_id) return alert("Nombre y entidad_id son requeridos")
    setSaving(true)
    try {
      const r = await fetch("/admin/api-keys", {
        ...OPTS, method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre, tipo: form.tipo, entidad_id: form.entidad_id, webhook_url: form.webhook_url || null }),
      })
      const d = await r.json()
      if (d.api_key) {
        setKeyGenerada(d.api_key.key)
        setShowForm(false)
        setForm(emptyApiForm())
        cargar()
      }
    } finally { setSaving(false) }
  }

  const toggleActiva = async (k: ApiKey) => {
    await fetch(`/admin/api-keys/${k.id}`, {
      ...OPTS, method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !k.activa }),
    })
    cargar()
  }

  const eliminar = async (k: ApiKey) => {
    if (!confirm(`¿Eliminar key "${k.nombre}"?`)) return
    await fetch(`/admin/api-keys/${k.id}`, { ...OPTS, method: "DELETE" })
    cargar()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
        Keys de acceso para NexoPOS (comercios) y mayoristas (integración ERP/WMS).
      </p>

      {/* Key recién generada */}
      {keyGenerada && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "14px 18px" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#92400e", margin: "0 0 8px" }}>
            ⚠️ Guardá esta key ahora — no se vuelve a mostrar completa
          </p>
          <div style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all", background: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 10 }}>
            {keyGenerada}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigator.clipboard.writeText(keyGenerada)}
              style={{ ...btnPrimary, padding: "8px 16px", fontSize: 13 }}>Copiar</button>
            <button onClick={() => setKeyGenerada(null)}
              style={{ ...btnPrimary, background: "#6b7280", padding: "8px 16px", fontSize: 13 }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Formulario nueva key */}
      {showForm && (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 14px" }}>Nueva API Key</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <Field label="Nombre descriptivo *">
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="NexoPOS Almacén Don Juan" style={inputStyle} />
            </Field>
            <Field label="Tipo *">
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))}
                style={inputStyle}>
                <option value="nexopos">NexoPOS (comercio)</option>
                <option value="mayorista">Mayorista (ERP/WMS)</option>
              </select>
            </Field>
            <Field label={form.tipo === "nexopos" ? "comercio_id *" : "mayorista_id *"}>
              <input value={form.entidad_id} onChange={e => setForm(f => ({ ...f, entidad_id: e.target.value }))}
                placeholder={form.tipo === "nexopos" ? "com_xxxx" : "may_xxxx"} style={inputStyle} />
            </Field>
            {form.tipo === "mayorista" && (
              <Field label="Webhook URL (opcional)">
                <input value={form.webhook_url} onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))}
                  placeholder="https://erp.ejemplo.com/webhooks/nexob2b" style={inputStyle} />
              </Field>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={crear} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Generando..." : "Generar key"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ ...btnPrimary, background: "#6b7280" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Barra: filtros + botón nueva */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["", "nexopos", "mayorista"] as const).map(t => (
            <button key={t} onClick={() => setFiltro(t)}
              style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 500,
                background: filtro === t ? "#2563eb" : "#f3f4f6",
                color: filtro === t ? "#fff" : "#374151",
                borderColor: filtro === t ? "#2563eb" : "#e5e7eb" }}>
              {t === "" ? "Todas" : t === "nexopos" ? "NexoPOS" : "Mayoristas"}
            </button>
          ))}
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setKeyGenerada(null) }} style={btnPrimary}>
            + Nueva key
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <p style={{ color: "#6b7280", fontSize: 14 }}>Cargando...</p>
      ) : keys.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 14 }}>
          No hay API keys. Creá una con el botón "+ Nueva key".
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                {["Nombre", "Tipo", "Entidad ID", "Key", "Estado", "Último uso", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 12px" }}>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{k.nombre}</div>
                    {k.webhook_url && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>🔗 {k.webhook_url.slice(0, 38)}{k.webhook_url.length > 38 ? "…" : ""}</div>}
                  </td>
                  <td style={{ padding: "12px 12px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: k.tipo === "nexopos" ? "#dbeafe" : "#d1fae5",
                      color: k.tipo === "nexopos" ? "#1e40af" : "#065f46",
                    }}>
                      {k.tipo === "nexopos" ? "NexoPOS" : "Mayorista"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 12px", fontFamily: "monospace", color: "#374151" }}>{k.entidad_id}</td>
                  <td style={{ padding: "12px 12px", fontFamily: "monospace", color: "#374151" }}>{k.key_preview}</td>
                  <td style={{ padding: "12px 12px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: k.activa ? "#d1fae5" : "#fee2e2",
                      color: k.activa ? "#065f46" : "#991b1b",
                    }}>
                      {k.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 12px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                    {k.ultimo_uso ? new Date(k.ultimo_uso).toLocaleDateString("es-AR") : "Nunca"}
                  </td>
                  <td style={{ padding: "12px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => toggleActiva(k)}
                        style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#374151" }}>
                        {k.activa ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => eliminar(k)}
                        style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #fca5a5", borderRadius: 6, background: "#fee2e2", color: "#991b1b" }}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("smtp")

  // SMTP
  const [smtp, setSmtp] = useState({ host: "", port: "587", user: "", pass: "" })
  const [passSet, setPassSet] = useState(false)

  // Mercado Pago
  const [mp, setMp] = useState({ public_key: "", access_token: "", comision_pct: "0.3", client_id: "", client_secret: "" })
  const [tokenSet, setTokenSet] = useState(false)
  const [clientSecretSet, setClientSecretSet] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/admin/configuracion", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.smtp) {
          setSmtp({ host: data.smtp.host, port: data.smtp.port, user: data.smtp.user, pass: "" })
          setPassSet(data.smtp.pass_set)
        }
        if (data.mp) {
          setMp({ public_key: data.mp.public_key, access_token: "", comision_pct: data.mp.comision_pct, client_id: data.mp.client_id || "", client_secret: "" })
          setTokenSet(data.mp.access_token_set)
          setClientSecretSet(data.mp.client_secret_set)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const guardarSmtp = async () => {
    setSaving(true); setMsg(null)
    try {
      const body: any = { smtp_host: smtp.host, smtp_port: smtp.port, smtp_user: smtp.user }
      if (smtp.pass) body.smtp_pass = smtp.pass
      const r = await fetch("/admin/configuracion", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        setMsg({ type: "ok", text: "Configuración SMTP guardada." })
        if (smtp.pass) { setPassSet(true); setSmtp((s) => ({ ...s, pass: "" })) }
      } else { setMsg({ type: "error", text: "Error al guardar." }) }
    } catch { setMsg({ type: "error", text: "Error de conexión." }) }
    finally { setSaving(false) }
  }

  const guardarMp = async () => {
    setSaving(true); setMsg(null)
    try {
      const body: any = {
        mp_public_key: mp.public_key,
        mp_comision_pct: mp.comision_pct,
        mp_client_id: mp.client_id,
      }
      if (mp.access_token && mp.access_token !== "••••••••") body.mp_access_token = mp.access_token
      if (mp.client_secret && mp.client_secret !== "••••••••") body.mp_client_secret = mp.client_secret
      const r = await fetch("/admin/configuracion", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        setMsg({ type: "ok", text: "Configuración de Mercado Pago guardada." })
        if (mp.access_token) { setTokenSet(true); setMp((m) => ({ ...m, access_token: "" })) }
        if (mp.client_secret) { setClientSecretSet(true); setMp((m) => ({ ...m, client_secret: "" })) }
      } else { setMsg({ type: "error", text: "Error al guardar." }) }
    } catch { setMsg({ type: "error", text: "Error de conexión." }) }
    finally { setSaving(false) }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "smtp",    label: "📧 Correo SMTP" },
    { key: "mp",      label: "💳 Mercado Pago" },
    { key: "apikeys", label: "🔑 API Keys" },
  ]

  return (
    <div style={{ padding: "32px", maxWidth: 760 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 24 }}>
        Configuración
      </h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "2px solid #e5e7eb", marginBottom: 32 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setMsg(null) }}
            style={{
              padding: "10px 20px", fontWeight: 600, fontSize: 14,
              border: "none", background: "none", cursor: "pointer",
              borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
              color: tab === t.key ? "#2563eb" : "#6b7280", marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab !== "apikeys" ? (
        <p style={{ color: "#6b7280" }}>Cargando...</p>
      ) : (
        <>
          {/* ── SMTP ── */}
          {tab === "smtp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
                Servidor de correo para notificaciones a comercios y mayoristas.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 16 }}>
                <Field label="Servidor SMTP (host)">
                  <input value={smtp.host} onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                    placeholder="zimbra.nubilus.com.ar" style={inputStyle} />
                </Field>
                <Field label="Puerto">
                  <input value={smtp.port} onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))}
                    placeholder="587" style={inputStyle} />
                </Field>
              </div>
              <Field label="Usuario (email remitente)">
                <input value={smtp.user} onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))}
                  placeholder="info@nexob2b.app" style={inputStyle} />
              </Field>
              <Field label={passSet ? "Contraseña (ya configurada — dejá vacío para no cambiarla)" : "Contraseña"}>
                <input type="password" value={smtp.pass}
                  onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))}
                  placeholder={passSet ? "••••••••" : "Contraseña SMTP"}
                  style={inputStyle} autoComplete="new-password" />
              </Field>
              {msg && <Msg msg={msg} />}
              <button onClick={guardarSmtp} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando..." : "Guardar configuración SMTP"}
              </button>
            </div>
          )}

          {/* ── MERCADO PAGO ── */}
          {tab === "mp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px" }}>
                <p style={{ fontSize: 13, color: "#1e40af", margin: 0, fontWeight: 500 }}>
                  🏪 <strong>Marketplace Split</strong> — La plata nunca toca tu cuenta.
                  MP descuenta su comisión, luego la tuya (<code>marketplace_fee</code>) y deposita el resto directo al mayorista.
                </p>
              </div>

              <Field label="Public Key">
                <input value={mp.public_key}
                  onChange={(e) => setMp((m) => ({ ...m, public_key: e.target.value }))}
                  placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  style={inputStyle} />
                <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Va al frontend del comercio para iniciar el checkout. No es secreta.
                </span>
              </Field>

              <Field label={tokenSet ? "Access Token (ya configurado — dejá vacío para no cambiarlo)" : "Access Token"}>
                <input type="password" value={mp.access_token}
                  onChange={(e) => setMp((m) => ({ ...m, access_token: e.target.value }))}
                  placeholder={tokenSet ? "••••••••" : "TEST-xxxx..."}
                  style={inputStyle} autoComplete="new-password" />
                <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Solo backend. Nunca se expone al frontend.
                </span>
              </Field>

              <Field label="Comisión de la plataforma (%)">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="number" min="0" max="100" step="0.1"
                    value={mp.comision_pct}
                    onChange={(e) => setMp((m) => ({ ...m, comision_pct: e.target.value }))}
                    style={{ ...inputStyle, width: 120 }} />
                  <span style={{ fontSize: 14, color: "#374151" }}>%</span>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    = <strong>${mp.comision_pct ? (1000 * parseFloat(mp.comision_pct) / 100).toFixed(2) : "0.00"}</strong> por cada $1.000 de venta
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Se aplica como <code>marketplace_fee</code> en cada preferencia de pago.
                </span>
              </Field>

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, marginTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 12px" }}>🔐 OAuth Marketplace (para que los mayoristas vinculen su cuenta)</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field label="Client ID (App MP Marketplace)">
                    <input value={mp.client_id}
                      onChange={(e) => setMp((m) => ({ ...m, client_id: e.target.value }))}
                      placeholder="123456789"
                      style={inputStyle} />
                    <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      ID de tu aplicación en el panel de developers de Mercado Pago. No es secreto.
                    </span>
                  </Field>
                  <Field label={clientSecretSet ? "Client Secret (ya configurado — dejá vacío para no cambiarlo)" : "Client Secret"}>
                    <input type="password" value={mp.client_secret}
                      onChange={(e) => setMp((m) => ({ ...m, client_secret: e.target.value }))}
                      placeholder={clientSecretSet ? "••••••••" : "Tu client secret de MP"}
                      style={inputStyle} autoComplete="new-password" />
                    <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      Secreto. Solo backend. Necesario para intercambiar el code OAuth por tokens.
                    </span>
                  </Field>
                </div>
              </div>

              {tokenSet && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px" }}>
                  <p style={{ fontSize: 13, color: "#15803d", margin: 0 }}>
                    ✅ Mercado Pago configurado. El Access Token está guardado.
                  </p>
                </div>
              )}

              {msg && <Msg msg={msg} />}
              <button onClick={guardarMp} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando..." : "Guardar configuración MP"}
              </button>
            </div>
          )}

          {/* ── API KEYS ── */}
          {tab === "apikeys" && <ApiKeysTab />}
        </>
      )}
    </div>
  )
}
