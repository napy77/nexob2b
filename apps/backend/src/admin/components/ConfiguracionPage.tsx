import { useState, useEffect } from "react"

type Tab = "smtp" | "mp"

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("smtp")

  // SMTP
  const [smtp, setSmtp] = useState({ host: "", port: "587", user: "", pass: "" })
  const [passSet, setPassSet] = useState(false)

  // Mercado Pago
  const [mp, setMp] = useState({ public_key: "", access_token: "", comision_pct: "0.3" })
  const [tokenSet, setTokenSet] = useState(false)

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
          setMp({ public_key: data.mp.public_key, access_token: "", comision_pct: data.mp.comision_pct })
          setTokenSet(data.mp.access_token_set)
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
      }
      if (mp.access_token && mp.access_token !== "••••••••") {
        body.mp_access_token = mp.access_token
      }
      const r = await fetch("/admin/configuracion", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        setMsg({ type: "ok", text: "Configuración de Mercado Pago guardada." })
        if (mp.access_token) { setTokenSet(true); setMp((m) => ({ ...m, access_token: "" })) }
      } else { setMsg({ type: "error", text: "Error al guardar." }) }
    } catch { setMsg({ type: "error", text: "Error de conexión." }) }
    finally { setSaving(false) }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "smtp", label: "📧 Correo SMTP" },
    { key: "mp",   label: "💳 Mercado Pago" },
  ]

  return (
    <div style={{ padding: "32px", maxWidth: 720 }}>
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

      {loading ? (
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
        </>
      )}
    </div>
  )
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

const inputStyle: React.CSSProperties = {
  padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8,
  fontSize: 14, color: "#111827", width: "100%", boxSizing: "border-box", outline: "none",
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px", background: "#2563eb", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  alignSelf: "flex-start",
}
