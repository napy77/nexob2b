import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import {
  getMPConnectUrl,
  exchangeMPCode,
  getMPCuenta,
  upsertMPCuenta,
  deleteMPCuenta,
} from "../../../../../lib/mp-oauth"

function verifyMayorista(req: MedusaRequest): { mayorista_id: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(
      auth.split(" ")[1],
      process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
    ) as { mayorista_id: string }
  } catch {
    return null
  }
}

// GET /store/mayoristas/me/mp
// Devuelve estado de conexión + URL para iniciar OAuth
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const cuenta = await getMPCuenta(payload.mayorista_id).catch(() => null)

  if (cuenta) {
    return res.json({
      connected: true,
      mp_user_id: cuenta.mp_user_id,
      mp_nickname: cuenta.mp_nickname,
      live_mode: cuenta.live_mode,
      connect_url: null,
    })
  }

  // Estado = no conectado → generar URL OAuth
  try {
    const state = crypto.randomBytes(16).toString("hex")
    const connect_url = await getMPConnectUrl(state)
    return res.json({ connected: false, connect_url, state })
  } catch (e: any) {
    return res.status(503).json({
      connected: false,
      connect_url: null,
      error: e.message,
    })
  }
}

// POST /store/mayoristas/me/mp
// Recibe { code } del callback OAuth, intercambia por tokens y guarda
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { code } = req.body as { code?: string }
  if (!code) return res.status(400).json({ error: "Falta el parámetro 'code'" })

  try {
    const tokens = await exchangeMPCode(code)
    await upsertMPCuenta(payload.mayorista_id, tokens)

    return res.json({
      ok: true,
      mp_nickname: tokens.mp_nickname,
      live_mode: tokens.live_mode,
    })
  } catch (e: any) {
    console.error("[MP OAuth] Error intercambiando code:", e.message)
    return res.status(502).json({ error: e.message })
  }
}

// DELETE /store/mayoristas/me/mp
// Desconecta la cuenta MP del mayorista
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  await deleteMPCuenta(payload.mayorista_id)
  return res.json({ ok: true })
}
