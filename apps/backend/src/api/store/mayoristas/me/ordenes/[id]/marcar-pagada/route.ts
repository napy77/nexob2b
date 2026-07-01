import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../../../modules/orden"
import { getPool } from "../../../../../../../lib/db-seq"
import jwt from "jsonwebtoken"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
  } catch { return null }
}

// PUT /store/mayoristas/me/ordenes/:id/marcar-pagada
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)
  if (!orden || orden.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }

  await getPool().query(
    `UPDATE orden SET is_pagada = true, updated_at = now() WHERE id = $1`,
    [orden.id]
  )

  return res.json({ ok: true, is_pagada: true })
}
