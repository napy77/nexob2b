import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEDIO_PAGO_MODULE } from "../../../../modules/medio_pago"

// PUT /admin/medios-pago/:id
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)
  const body = req.body as any
  const updated = await svc.updateMedioPagos({
    id: req.params.id,
    ...(body.nombre      !== undefined && { nombre: body.nombre }),
    ...(body.tipo        !== undefined && { tipo: body.tipo }),
    ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
    ...(body.icono       !== undefined && { icono: body.icono }),
    ...(body.activo      !== undefined && { activo: body.activo }),
    ...(body.orden       !== undefined && { orden: body.orden }),
    ...(body.integracion !== undefined && { integracion: body.integracion }),
    ...(body.config      !== undefined && { config: body.config ? JSON.stringify(body.config) : null }),
  })
  res.json({ medio_pago: Array.isArray(updated) ? updated[0] : updated })
}

// DELETE /admin/medios-pago/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)
  await svc.deleteMedioPagos([req.params.id])
  res.json({ deleted: true })
}
