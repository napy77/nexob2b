import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../../modules/taxonomia"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { id } = req.params
  const { nombre, descripcion, precio_con_impuestos, activo } = req.body as any
  const update: any = { id }
  if (nombre !== undefined) update.nombre = nombre.trim()
  if (descripcion !== undefined) update.descripcion = descripcion?.trim() || null
  if (precio_con_impuestos !== undefined) update.precio_con_impuestos = precio_con_impuestos
  if (activo !== undefined) update.activo = activo
  const tipo = await svc.updateTipoImpositivos(update)
  return res.json({ tipo })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  await svc.deleteTipoImpositivos(req.params.id)
  return res.json({ success: true })
}
