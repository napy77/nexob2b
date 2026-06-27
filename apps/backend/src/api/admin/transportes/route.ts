import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRANSPORTE_MODULE } from "../../../modules/transporte"

// GET /admin/transportes
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)
  const transportes = await svc.listTransportes({}, { order: { orden: "ASC" } })
  res.json({ transportes })
}

// POST /admin/transportes
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)
  const body = req.body as any
  const transporte = await svc.createTransportes({
    nombre: body.nombre,
    tipo: body.tipo || "envio_propio",
    descripcion: body.descripcion || null,
    icono: body.icono || null,
    activo: body.activo !== false,
    orden: body.orden ?? 0,
    porcentaje_costo: parseFloat(String(body.porcentaje_costo)) || 0,
  })
  res.status(201).json({ transporte })
}
