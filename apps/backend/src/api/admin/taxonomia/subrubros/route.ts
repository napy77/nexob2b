import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../modules/taxonomia"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { rubro_id } = req.query as any
  const filtro: any = rubro_id ? { rubro_id } : {}
  const subrubros = await svc.listSubrubros(filtro, { order: { nombre: "ASC" } })
  return res.json({ subrubros })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { nombre, rubro_id } = req.body as any
  if (!nombre?.trim()) return res.status(400).json({ error: "nombre requerido" })
  if (!rubro_id) return res.status(400).json({ error: "rubro_id requerido" })
  const subrubro = await svc.createSubrubros({ nombre: nombre.trim(), rubro_id, activo: true })
  return res.json({ subrubro })
}
