import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../modules/orden"
import jwt from "jsonwebtoken"

const verifyComercio = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { comercio_id: string }
  } catch { return null }
}

// GET /store/ordenes/:id/documentos — comercio ve los documentos adjuntos por el mayorista
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyComercio(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { id } = req.params
  const svc: any = req.scope.resolve(ORDEN_MODULE)

  const orden = await svc.retrieveOrden(id).catch(() => null)
  if (!orden || orden.comercio_id !== payload.comercio_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }

  const documentos = await svc.listOrdenDocumentos(
    { orden_id: id },
    { order: { created_at: "ASC" } }
  )
  return res.json({ documentos })
}
