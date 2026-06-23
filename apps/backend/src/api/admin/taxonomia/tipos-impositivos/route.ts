import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../modules/taxonomia"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const tipos = await svc.listTipoImpositivos({}, { order: { nombre: "ASC" } })
  return res.json({ tipos })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const { nombre, descripcion, precio_con_impuestos } = req.body as any
  if (!nombre?.trim()) return res.status(400).json({ error: "nombre requerido" })
  const tipo = await svc.createTipoImpositivos({
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    precio_con_impuestos: precio_con_impuestos !== false,
    activo: true,
  })
  return res.json({ tipo })
}
