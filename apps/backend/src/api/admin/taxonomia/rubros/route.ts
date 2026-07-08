import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../modules/taxonomia"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const [rubros, pasillos] = await Promise.all([
    svc.listRubros({}, { order: { nombre: "ASC" } }),
    svc.listPasillos({}),
  ])
  const pasilloMap: Record<string, string> = {}
  pasillos.forEach((p: any) => { pasilloMap[p.id] = p.nombre })
  const enriched = rubros.map((r: any) => ({
    ...r,
    pasillo_nombre: r.pasillo_id ? (pasilloMap[r.pasillo_id] || null) : null,
  }))
  return res.json({ rubros: enriched })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { nombre, pasillo_id } = req.body as any
  if (!nombre?.trim()) return res.status(400).json({ error: "nombre requerido" })
  const rubro = await svc.createRubros({ nombre: nombre.trim(), pasillo_id: pasillo_id || null, activo: true })
  return res.json({ rubro })
}
