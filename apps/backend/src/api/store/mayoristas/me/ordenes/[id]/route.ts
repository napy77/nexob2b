import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../../modules/orden"
import { COMERCIO_MODULE } from "../../../../../../modules/comercio"
import jwt from "jsonwebtoken"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { mayorista_id: string }
  } catch { return null }
}

const TRANSICIONES: Record<string, string[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["enviado", "cancelado"],
  enviado: [],      // el comercio marca como entregado
  entregado: [],
  cancelado: [],
}

// GET /store/mayoristas/me/ordenes/:id
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)
  if (!orden || orden.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }

  const items = await svc.listOrdenItems({ orden_id: orden.id }, { order: { created_at: "ASC" } })

  // Info del comercio
  const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)
  const comercio = await comercioSvc.retrieveComercio(orden.comercio_id).catch(() => null)

  return res.json({ orden: { ...orden, items, comercio } })
}

// PUT /store/mayoristas/me/ordenes/:id — cambiar estado
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)
  if (!orden || orden.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }

  const { estado } = req.body as any
  const transicionesValidas = TRANSICIONES[orden.estado] || []
  if (!transicionesValidas.includes(estado)) {
    return res.status(400).json({
      error: `No se puede pasar de "${orden.estado}" a "${estado}"`
    })
  }

  const updated = await svc.updateOrdens({ id: orden.id, estado })
  return res.json({ orden: updated })
}
