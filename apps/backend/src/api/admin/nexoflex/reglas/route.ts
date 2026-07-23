import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRANSPORTE_MODULE } from "../../../../modules/transporte"

// GET /admin/nexoflex/reglas
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)
  const reglas = await svc.listNexoflexReglas(
    { deleted_at: null },
    { order: { orden: "ASC" } }
  )
  // Enriquecer con nombre del transporte asignado
  const transportes = await svc.listTransportes({}, { select: ["id", "nombre", "icono", "tipo"] })
  const tMap = Object.fromEntries(transportes.map((t: any) => [t.id, t]))
  const enriched = reglas.map((r: any) => ({ ...r, transporte: tMap[r.transporte_id] || null }))
  res.json({ reglas: enriched, transportes })
}

// POST /admin/nexoflex/reglas
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)
  const body = req.body as any

  if (!body.nombre?.trim()) return res.status(400).json({ error: "nombre requerido" })
  if (!body.condicion) return res.status(400).json({ error: "condicion requerida" })
  if (!body.transporte_id) return res.status(400).json({ error: "transporte_id requerido" })

  const regla = await svc.createNexoflexReglas({
    nombre: body.nombre.trim(),
    condicion: body.condicion,
    condicion_valor: body.condicion_valor != null ? parseFloat(String(body.condicion_valor)) : null,
    transporte_id: body.transporte_id,
    orden: body.orden ?? 0,
    activo: body.activo !== false,
  })
  res.status(201).json({ regla })
}
