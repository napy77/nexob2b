import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../../modules/taxonomia"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { id } = req.params
  const { nombre, activo } = req.body as any
  const update: any = { id }
  if (nombre !== undefined) update.nombre = nombre.trim()
  if (activo !== undefined) update.activo = activo
  const pasillo = await svc.updatePasillos(update)
  return res.json({ pasillo })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  await svc.deletePasillos(req.params.id)
  return res.json({ success: true })
}
