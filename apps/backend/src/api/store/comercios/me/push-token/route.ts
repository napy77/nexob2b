import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../../../modules/comercio"
import jwt from "jsonwebtoken"

function verifyToken(req: MedusaRequest): { comercio_id: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as any
  } catch { return null }
}

// POST /store/comercios/me/push-token — guardar Expo push token del comercio
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { push_token } = req.body as any
  if (!push_token) return res.status(400).json({ error: "push_token requerido" })

  const svc: any = req.scope.resolve(COMERCIO_MODULE)
  await svc.updateComercios({ id: payload.comercio_id, push_token })

  return res.json({ ok: true })
}

// DELETE /store/comercios/me/push-token — borrar token (logout)
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(COMERCIO_MODULE)
  await svc.updateComercios({ id: payload.comercio_id, push_token: null })

  return res.json({ ok: true })
}
