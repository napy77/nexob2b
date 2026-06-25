import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../modules/orden"
import { COMERCIO_MODULE } from "../../../../../modules/comercio"
import jwt from "jsonwebtoken"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
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

  const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)

  const ordenesConItems = await Promise.all(ordenes.map(async (o: any) => {
    const items = await svc.listOrdenItems({ orden_id: o.id }, { order: { created_at: "ASC" } })
    const comercio = await comercioSvc.retrieveComercio(o.comercio_id).catch(() => null)
    return { ...o, items, comercio_nombre: comercio?.nombre || null }
  }))

  return res.json({ ordenes: ordenesConItems })
}
