"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type ApiKeyInfo = {
  id: string
  nombre: string
  activa: boolean
  webhook_url: string | null
  ultimo_uso: string | null
  created_at: string
  key_preview: string
}

function api(path: string, token: string, opts: RequestInit = {}) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUB_KEY,
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  }).then(r => r.json())
}

export default function ApiPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [keyInfo, setKeyInfo] = useState<ApiKeyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [webhookInput, setWebhookInput] = useState("")
  const [guardandoWh, setGuardandoWh] = useState(false)
  const [keyRecienGenerada, setKeyRecienGenerada] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null)

  useEffect(() => {
    const t = localStorage.getItem("mayorista_token") || ""
    if (!t) { router.push("/mayorista/login"); return }
    setToken(t)
    api("/store/mayoristas/me/api-key", t)
      .then(d => {
        setKeyInfo(d.api_key)
        if (d.api_key?.webhook_url) setWebhookInput(d.api_key.webhook_url)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const generarKey = async () => {
    if (!confirm("¿Generar nueva API key? La anterior quedará inactiva.")) return
    setGenerando(true)
    setKeyRecienGenerada(null)
    try {
      const d = await api("/store/mayoristas/me/api-key", token, {
        method: "POST",
        body: JSON.stringify({ webhook_url: webhookInput || null }),
      })
      if (d.api_key) {
        setKeyRecienGenerada(d.api_key.key)
        setKeyInfo({ ...d.api_key, key_preview: d.api_key.key.slice(0, 12) + "********************" })
        setMsg({ tipo: "ok", texto: "Key generada. Copiala ahora — no se vuelve a mostrar completa." })
      }
    } catch {
      setMsg({ tipo: "err", texto: "Error al generar la key." })
    } finally {
      setGenerando(false)
    }
  }

  const guardarWebhook = async () => {
    setGuardandoWh(true)
    try {
      const d = await api("/store/mayoristas/me/api-key", token, {
        method: "PUT",
        body: JSON.stringify({ webhook_url: webhookInput || null }),
      })
      if (d.api_key) {
        setKeyInfo(k => k ? { ...k, webhook_url: d.api_key.webhook_url } : k)
        setMsg({ tipo: "ok", texto: "Webhook actualizado." })
      }
    } catch {
      setMsg({ tipo: "err", texto: "Error al guardar el webhook." })
    } finally {
      setGuardandoWh(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Integración API</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>
        Conectá tu sistema (ERP, WMS) a Nexo B2B para sincronizar stock, precios y recibir órdenes automáticamente.
      </p>

      {msg && (
        <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 20,
          background: msg.tipo === "ok" ? "#d1fae5" : "#fee2e2",
          color: msg.tipo === "ok" ? "#065f46" : "#b91c1c", fontSize: 14 }}>
          {msg.texto}
          <button onClick={() => setMsg(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>✕</button>
        </div>
      )}

      {/* ── API Key ── */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #f0f0f0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Tu API Key</h2>

        {keyInfo ? (
          <>
            <div style={{ background: "#f9fafb", borderRadius: 10, padding: "14px 16px", fontFamily: "monospace", fontSize: 14, color: "#111827", wordBreak: "break-all", marginBottom: 12 }}>
              {keyRecienGenerada || keyInfo.key_preview}
            </div>
            {keyRecienGenerada && (
              <div style={{ background: "#fef3c7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 12 }}>
                ⚠️ Esta es la única vez que se muestra la key completa. Copiala y guardala ahora.
                <button
                  onClick={() => navigator.clipboard.writeText(keyRecienGenerada)}
                  style={{ marginLeft: 12, background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
                >
                  Copiar
                </button>
              </div>
            )}
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
              Estado: <strong style={{ color: keyInfo.activa ? "#16a34a" : "#dc2626" }}>{keyInfo.activa ? "Activa" : "Inactiva"}</strong>
            </div>
            {keyInfo.ultimo_uso && (
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                Último uso: {new Date(keyInfo.ultimo_uso).toLocaleString("es-AR")}
              </div>
            )}
          </>
        ) : (
          <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 12 }}>No tenés ninguna API key generada.</p>
        )}

        <button
          onClick={generarKey}
          disabled={generando}
          style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          {generando ? "Generando..." : keyInfo ? "🔄 Regenerar key" : "✦ Generar API key"}
        </button>
      </div>

      {/* ── Webhook ── */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #f0f0f0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Webhook de nuevas órdenes</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>
          Cuando un comercio te hace un pedido, Nexo B2B hace un POST a tu URL con el payload de la orden.
        </p>
        <input
          type="url"
          value={webhookInput}
          onChange={e => setWebhookInput(e.target.value)}
          placeholder="https://tu-erp.com/webhooks/nexob2b"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
        />
        <button
          onClick={guardarWebhook}
          disabled={guardandoWh || !keyInfo}
          style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: !keyInfo ? 0.5 : 1 }}
        >
          {guardandoWh ? "Guardando..." : "Guardar webhook"}
        </button>
        {!keyInfo && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Generá una API key primero para habilitar el webhook.</p>}
      </div>

      {/* ── Docs rápida ── */}
      <div style={{ background: "#f0f9ff", borderRadius: 16, padding: 24, border: "1px solid #bae6fd" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#0369a1" }}>Referencia rápida</h2>
        <p style={{ fontSize: 13, color: "#0c4a6e", marginBottom: 10 }}>
          Mandá el header <code style={{ background: "#e0f2fe", padding: "2px 6px", borderRadius: 4 }}>X-API-Key: tu_key</code> en cada request.
        </p>
        {[
          { method: "POST", path: "/api/v1/mayorista/sync", desc: "Sync masivo stock/precio por EAN" },
          { method: "GET",  path: "/api/v1/mayorista/ordenes", desc: "Listar órdenes entrantes" },
          { method: "PUT",  path: "/api/v1/mayorista/ordenes/:id", desc: "Actualizar estado de una orden" },
        ].map(e => (
          <div key={e.path} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ background: e.method === "GET" ? "#dbeafe" : e.method === "POST" ? "#d1fae5" : "#fef3c7",
              color: e.method === "GET" ? "#1d4ed8" : e.method === "POST" ? "#065f46" : "#92400e",
              borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: "monospace", flexShrink: 0, marginTop: 2 }}>
              {e.method}
            </span>
            <div>
              <code style={{ fontSize: 13, color: "#111827" }}>{BACKEND_URL}{e.path}</code>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{e.desc}</p>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 16, padding: "12px 14px", background: "#e0f2fe", borderRadius: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>Ejemplo sync masivo:</p>
          <pre style={{ fontSize: 12, color: "#0c4a6e", margin: 0, whiteSpace: "pre-wrap" }}>{`POST /api/v1/mayorista/sync
X-API-Key: nxmay_xxxx

{
  "items": [
    { "ean": "7790040005730", "precio": 1250.00, "stock": 48 },
    { "ean": "7794000012354", "stock": 0 }
  ]
}`}</pre>
        </div>

        <div style={{ marginTop: 10, padding: "12px 14px", background: "#e0f2fe", borderRadius: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>Payload webhook (orden nueva):</p>
          <pre style={{ fontSize: 12, color: "#0c4a6e", margin: 0, whiteSpace: "pre-wrap" }}>{`POST https://tu-erp.com/webhooks/nexob2b
X-Nexo-Event: orden.nueva

{
  "evento": "orden.nueva",
  "timestamp": "2026-07-05T10:30:00.000Z",
  "orden_id": "ord_xxxx",
  "numero": "ORD-00042",
  "total": 18500.00,
  "comercio_id": "com_xxxx",
  "comercio_nombre": "Almacén Don Juan",
  "items": 3
}`}</pre>
        </div>
      </div>
    </div>
  )
}
