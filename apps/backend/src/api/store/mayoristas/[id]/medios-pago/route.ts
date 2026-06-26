import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { MEDIO_PAGO_MODULE } from "../../../../../modules/medio_pago"

// GET /store/mayoristas/:id/medios-pago?comercio_id=xxx
// Devuelve los medios activos para este mayorista, filtrando por overrides del comercio
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const auth = req.headers.authorization
  let comercio_id: string | null = null
  if (auth?.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as any
      comercio_id = p.comercio_id || null
    } catch {}
  }

  const mayorista_id = req.params.id
  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)

  // Medios globales activos
  const [globales, configMayorista, configContacto] = await Promise.all([
    svc.listMedioPagos({ activo: true }, { order: { orden: "ASC" } }),
    svc.listMayoristaMedioPagos({ mayorista_id }),
    comercio_id
      ? svc.listContactoMedioPagos({ mayorista_id, comercio_id })
      : Promise.resolve([]),
  ])

  const globalMap = new Map<string, any>(configMayorista.map((c: any) => [c.medio_pago_id, c]))
  const contactoMap = new Map<string, boolean>(configContacto.map((c: any) => [c.medio_pago_id, c.habilitado as boolean]))

  const medios = globales
    .filter((m: any) => {
      const configMay: any = globalMap.get(m.id)
      const habGlobal: boolean = configMay ? configMay.habilitado : true
      if (!habGlobal) return false
      const habContacto: boolean = contactoMap.has(m.id) ? (contactoMap.get(m.id) as boolean) : true
      return habContacto
    })
    .map((m: any) => {
      const configMay: any = globalMap.get(m.id)
      const porcentaje = configMay && configMay.porcentaje_costo != null && configMay.porcentaje_costo > 0
        ? parseFloat(String(configMay.porcentaje_costo))
        : parseFloat(String(m.porcentaje_costo)) || 0
      return {
        id: m.id,
        nombre: m.nombre,
        tipo: m.tipo,
        icono: m.icono,
        descripcion: m.descripcion,
        porcentaje_costo: porcentaje,
      }
    })

  return res.json({ medios_pago: medios })
}
