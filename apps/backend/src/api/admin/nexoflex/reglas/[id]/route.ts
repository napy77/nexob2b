import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRANSPORTE_MODULE } from "../../../../../modules/transporte"

// PUT /admin/nexoflex/reglas/:id
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)
  const body = req.body as any
  const update: any = { id: req.params.id }
  if (body.nombre       !== undefined) update.nombre          = body.nombre.trim()
  if (body.condicion    !== undefined) update.condicion       = body.condicion
  if (body.condicion_valor !== undefined)
    update.condicion_valor = body.condicion_valor != null ? parseFloat(String(body.condicion_valor)) : null
  if (body.transporte_id !== undefined) update.transporte_id = body.transporte_id
  if (body.orden        !== undefined) update.orden          = Number(body.orden)
  if (body.activo       !== undefined) update.activo         = !!body.activo

  const updated = await svc.updateNexoflexReglas(update)
  res.json({ regla: Array.isArray(updated) ? updated[0] : updated })
}

// DELETE /admin/nexoflex/reglas/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)
  await svc.deleteNexoflexReglas([req.params.id])
  res.json({ deleted: true })
}
