import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getManyConfig, setManyConfig } from "../../../lib/config-store"

const SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass"]

// GET /admin/configuracion — devuelve config actual (pass ofuscado)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cfg = await getManyConfig(SMTP_KEYS)
  return res.json({
    smtp: {
      host: cfg.smtp_host || process.env.SMTP_HOST || "",
      port: cfg.smtp_port || process.env.SMTP_PORT || "587",
      user: cfg.smtp_user || process.env.SMTP_USER || "",
      pass: cfg.smtp_pass ? "••••••••" : (process.env.SMTP_PASS ? "••••••••" : ""),
      pass_set: !!(cfg.smtp_pass || process.env.SMTP_PASS),
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
  // Solo actualizar pass si viene un valor real (no los puntos de ofuscación)
  if (body.smtp_pass !== undefined && body.smtp_pass !== "••••••••") {
    entries.smtp_pass = body.smtp_pass
  }

  if (Object.keys(entries).length > 0) {
    await setManyConfig(entries)
  }

  return res.json({ ok: true })
}
