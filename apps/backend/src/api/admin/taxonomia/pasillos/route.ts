import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../modules/taxonomia"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const pasillos = await svc.listPasillos({}, { order: { nombre: "ASC" } })
  return res.json({ pasillos })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { nombre } = req.body as any
  if (!nombre?.trim()) return res.status(400).json({ error: "nombre requerido" })
  const pasillo = await svc.createPasillos({ nombre: nombre.trim(), activo: true })
  return res.json({ pasillo })
}
