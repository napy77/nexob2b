import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../../modules/taxonomia"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { id } = req.params
  const { nombre, activo, rubro_id } = req.body as any
  const update: any = { id }
  if (nombre !== undefined) update.nombre = nombre.trim()
  if (activo !== undefined) update.activo = activo
  if (rubro_id !== undefined) update.rubro_id = rubro_id
  const subrubro = await svc.updateSubrubros(update)
  return res.json({ subrubro })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  await svc.deleteSubrubros(req.params.id)
  return res.json({ success: true })
}
