import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../modules/orden"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import jwt from "jsonwebtoken"

const verifyComercio = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { comercio_id: string }
  } catch { return null }
}

// GET /store/ordenes/:id
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyComercio(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)
  if (!orden || orden.comercio_id !== payload.comercio_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }

  const items = await svc.listOrdenItems({ orden_id: orden.id }, { order: { created_at: "ASC" } })

  // Enriquecer con nombre del mayorista
  let mayorista_nombre = ""
  try {
    const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
    const m = await mayoristaService.retrieveMayorista(orden.mayorista_id)
    mayorista_nombre = m?.nombre || ""
  } catch {}

  return res.json({ orden: { ...orden, items, mayorista_nombre } })
}
