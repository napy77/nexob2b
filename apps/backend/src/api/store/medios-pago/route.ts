import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEDIO_PAGO_MODULE } from "../../../modules/medio_pago"

// GET /store/medios-pago — lista todos (admin)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)
  const medios = await svc.listMedioPagos({}, { order: { orden: "ASC" } })
  return res.json({ medios_pago: medios })
}

// POST /store/medios-pago — crear nuevo
export async function POST(req: MedusaRequest, res: MedusaResponse) {
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
  return res.status(201).json({ medio_pago: medio })
}
