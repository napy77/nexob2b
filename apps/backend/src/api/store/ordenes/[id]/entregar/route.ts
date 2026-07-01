import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../modules/orden"
import jwt from "jsonwebtoken"

const verifyComercio = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { comercio_id: string }
  } catch { return null }
}

// PUT /store/ordenes/:id/entregar
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyComercio(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)
  if (!orden || orden.comercio_id !== payload.comercio_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }
  if (!["en_transporte", "listo"].includes(orden.estado)) {
    return res.status(400).json({ error: "Solo se puede confirmar entrega de un pedido en camino o listo para retiro" })
  }

  const updated = await svc.updateOrdens({ id: orden.id, estado: "entregado" })
  return res.json({ orden: updated })
}
