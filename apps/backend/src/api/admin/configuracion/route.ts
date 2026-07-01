import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getManyConfig, setManyConfig } from "../../../lib/config-store"

const SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass"]
const MP_KEYS = ["mp_public_key", "mp_access_token", "mp_comision_pct", "mp_client_id", "mp_client_secret"]

// GET /admin/configuracion — devuelve config actual (tokens ofuscados)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cfg = await getManyConfig([...SMTP_KEYS, ...MP_KEYS])
  return res.json({
    smtp: {
      host: cfg.smtp_host || process.env.SMTP_HOST || "",
      port: cfg.smtp_port || process.env.SMTP_PORT || "587",
      user: cfg.smtp_user || process.env.SMTP_USER || "",
      pass: cfg.smtp_pass ? "••••••••" : (process.env.SMTP_PASS ? "••••••••" : ""),
      pass_set: !!(cfg.smtp_pass || process.env.SMTP_PASS),
    },
    mp: {
      public_key: cfg.mp_public_key || "",
      access_token_set: !!(cfg.mp_access_token),
      comision_pct: cfg.mp_comision_pct || "0.3",
      client_id: cfg.mp_client_id || "",
      client_secret_set: !!(cfg.mp_client_secret),
    },
  })
}

// PUT /admin/configuracion — guarda config
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as any
  const entries: Record<string, string> = {}

  if (body.smtp_host !== undefined) entries.smtp_host = body.smtp_host
  if (body.smtp_port !== undefined) entries.smtp_port = String(body.smtp_port)
  if (body.smtp_user !== undefined) entries.smtp_user = body.smtp_user
  if (body.smtp_pass !== undefined && body.smtp_pass !== "••••••••") {
    entries.smtp_pass = body.smtp_pass
  }

  if (body.mp_public_key !== undefined) entries.mp_public_key = body.mp_public_key
  if (body.mp_access_token !== undefined && body.mp_access_token !== "••••••••") {
    entries.mp_access_token = body.mp_access_token
  }
  if (body.mp_comision_pct !== undefined) entries.mp_comision_pct = String(body.mp_comision_pct)
  if (body.mp_client_id !== undefined) entries.mp_client_id = body.mp_client_id
  if (body.mp_client_secret !== undefined && body.mp_client_secret !== "••••••••") {
    entries.mp_client_secret = body.mp_client_secret
  }

  if (Object.keys(entries).length > 0) {
    await setManyConfig(entries)
  }

  return res.json({ ok: true })
}
