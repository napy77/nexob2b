import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEDIO_PAGO_MODULE } from "../../../modules/medio_pago"

// GET /admin/medios-pago
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)
  const medios = await svc.listMedioPagos({}, { order: { orden: "ASC" } })
  res.json({ medios_pago: medios })
}

// POST /admin/medios-pago
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)
  const body = req.body as any
  const medio = await svc.createMedioPagos({
    nombre: body.nombre,
    tipo: body.tipo || "efectivo",
    descripcion: body.descripcion || null,
    icono: body.icono || null,
    activo: body.activo !== false,
    orden: body.orden ?? 0,
    integracion: body.integracion || null,
    config: body.config ? JSON.stringify(body.config) : null,
  })
  res.status(201).json({ medio_pago: medio })
}
