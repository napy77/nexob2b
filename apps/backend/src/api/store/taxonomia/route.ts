import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../modules/taxonomia"

// GET /store/taxonomia — devuelve toda la taxonomía activa
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
  const [rubros, subrubros, pasillos, tipos_impositivos, alicuotas] = await Promise.all([
    svc.listRubros({ activo: true }, { order: { nombre: "ASC" } }),
    svc.listSubrubros({ activo: true }, { order: { nombre: "ASC" } }),
    svc.listPasillos({ activo: true }, { order: { nombre: "ASC" } }),
    svc.listTipoImpositivos({ activo: true }, { order: { nombre: "ASC" } }),
    svc.listAlicuotaIvas({ activo: true }, { order: { porcentaje: "ASC" } }),
  ])
  return res.json({ rubros, subrubros, pasillos, tipos_impositivos, alicuotas })
}
