import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../modules/orden"
import jwt from "jsonwebtoken"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { mayorista_id: string }
  } catch { return null }
}

// GET /store/mayoristas/me/ordenes
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const ordenes = await svc.listOrdens(
    { mayorista_id: payload.mayorista_id },
    { order: { created_at: "DESC" } }
  )

  const ordenesConItems = await Promise.all(ordenes.map(async (o: any) => {
    const items = await svc.listOrdenItems({ orden_id: o.id }, { order: { created_at: "ASC" } })
    return { ...o, items }
  }))

  return res.json({ ordenes: ordenesConItems })
}
