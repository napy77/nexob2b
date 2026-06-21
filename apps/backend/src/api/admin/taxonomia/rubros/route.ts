import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../modules/taxonomia"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const rubros = await svc.listRubros({}, { order: { nombre: "ASC" } })
  return res.json({ rubros })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { nombre } = req.body as any
  if (!nombre?.trim()) return res.status(400).json({ error: "nombre requerido" })
  const rubro = await svc.createRubros({ nombre: nombre.trim(), activo: true })
  return res.json({ rubro })
}
