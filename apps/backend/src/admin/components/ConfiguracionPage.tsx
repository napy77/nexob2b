import { useState, useEffect } from "react"

type Tab = "smtp"

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("smtp")
  const [smtp, setSmtp] = useState({
    host: "",
    port: "587",
    user: "",
    pass: "",
  })
  const [passSet, setPassSet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/admin/configuracion", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.smtp) {
          setSmtp({
            host: data.smtp.host,
            port: data.smtp.port,
            user: data.smtp.user,
            pass: "",
          })
          setPassSet(data.smtp.pass_set)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const guardar = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const body: any = {
        smtp_host: smtp.host,
        smtp_port: smtp.port,
        smtp_user: smtp.user,
      }
      if (smtp.pass) body.smtp_pass = smtp.pass
      const r = await fetch("/admin/configuracion", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        setMsg({ type: "ok", text: "Configuración guardada correctamente." })
        if (smtp.pass) { setPassSet(true); setSmtp((s) => ({ ...s, pass: "" })) }
      } else {
        setMsg({ type: "error", text: "Error al guardar." })
      }
    } catch {
      setMsg({ type: "error", text: "Error de conexión." })
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "smtp", label: "📧 Correo SMTP" },
  ]

  return (
    <div style={{ padding: "32px", maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 24 }}>
        Configuración General
      </h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "2px solid #e5e7eb", marginBottom: 32 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
              color: tab === t.key ? "#2563eb" : "#6b7280",
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SMTP Tab */}
      {tab === "smtp" && (
        <div>
          {loading ? (
            <p style={{ color: "#6b7280" }}>Cargando...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
                Configuración del servidor de correo para envío de notificaciones a comercios y mayoristas.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 16 }}>
                <Field label="Servidor SMTP (host)">
                  <input
                    value={smtp.host}
                    onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                    placeholder="zimbra.nubilus.com.ar"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Puerto">
                  <input
                    value={smtp.port}
                    onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))}
                    placeholder="587"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Usuario (email remitente)">
                <input
                  value={smtp.user}
                  onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))}
                  placeholder="info@nexob2b.app"
                  style={inputStyle}
                />
              </Field>

              <Field label={`Contraseña${passSet ? " (ya configurada — dejá vacío para no cambiarla)" : ""}`}>
                <input
                  type="password"
                  value={smtp.pass}
                  onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))}
                  placeholder={passSet ? "••••••••" : "Contraseña SMTP"}
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </Field>

              {msg && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: msg.type === "ok" ? "#d1fae5" : "#fee2e2",
                    color: msg.type === "ok" ? "#065f46" : "#991b1b",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {msg.type === "ok" ? "✅ " : "❌ "}{msg.text}
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={guardar} disabled={saving} style={btnPrimary}>
                  {saving ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
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
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  color: "#111827",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}
