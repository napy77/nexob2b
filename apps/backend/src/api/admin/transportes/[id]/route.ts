import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRANSPORTE_MODULE } from "../../../../modules/transporte"

// PUT /admin/transportes/:id
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)
  const body = req.body as any
  const updated = await svc.updateTransportes({
    id: req.params.id,
    ...(body.nombre            !== undefined && { nombre: body.nombre }),
    ...(body.tipo              !== undefined && { tipo: body.tipo }),
    ...(body.descripcion       !== undefined && { descripcion: body.descripcion }),
    ...(body.icono             !== undefined && { icono: body.icono }),
    ...(body.activo            !== undefined && { activo: body.activo }),
    ...(body.orden             !== undefined && { orden: body.orden }),
    ...(body.porcentaje_costo  !== undefined && { porcentaje_costo: parseFloat(String(body.porcentaje_costo)) || 0 }),
  })
  res.json({ transporte: Array.isArray(updated) ? updated[0] : updated })
}

// DELETE /admin/transportes/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)
  await svc.deleteTransportes([req.params.id])
  res.json({ deleted: true })
}
