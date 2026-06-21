import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../modules/taxonomia"

// GET /store/taxonomia — devuelve rubros, subrubros y pasillos activos
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const [rubros, subrubros, pasillos] = await Promise.all([
    svc.listRubros({ activo: true }, { order: { nombre: "ASC" } }),
    svc.listSubrubros({ activo: true }, { order: { nombre: "ASC" } }),
    svc.listPasillos({ activo: true }, { order: { nombre: "ASC" } }),
  ])
  return res.json({ rubros, subrubros, pasillos })
}
