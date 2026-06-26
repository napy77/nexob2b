import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { MEDIO_PAGO_MODULE } from "../../../../../modules/medio_pago"

function verifyMayorista(req: MedusaRequest): { mayorista_id: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const payload = jwt.verify(
      auth.split(" ")[1],
      process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
    ) as any
    if (!payload.mayorista_id || payload.rol === "vendedor") return null
    return { mayorista_id: payload.mayorista_id }
  } catch { return null }
}

// GET /store/mayoristas/me/medios-pago
// Devuelve todos los medios globales activos con flag habilitado por este mayorista
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)

  const [globales, configurados] = await Promise.all([
    svc.listMedioPagos({ activo: true }, { order: { orden: "ASC" } }),
    svc.listMayoristaMedioPagos({ mayorista_id: payload.mayorista_id }),
  ])

  // Si el mayorista nunca configuró un medio → habilitado por defecto
  const configMap = new Map(configurados.map((c: any) => [c.medio_pago_id, c]))

  const medios = globales.map((m: any) => {
    const config = configMap.get(m.id)
    return {
      ...m,
      habilitado: config ? config.habilitado : true,
      porcentaje_costo: config && config.porcentaje_costo != null
        ? parseFloat(String(config.porcentaje_costo))
        : parseFloat(String(m.porcentaje_costo)) || 0,
    }
  })

  return res.json({ medios_pago: medios })
}

// PUT /store/mayoristas/me/medios-pago
// Body: { medio_pago_id, habilitado }
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { medio_pago_id, habilitado, porcentaje_costo } = req.body as any
  if (!medio_pago_id) return res.status(400).json({ error: "medio_pago_id requerido" })

  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)

  const existentes = await svc.listMayoristaMedioPagos({
    mayorista_id: payload.mayorista_id,
    medio_pago_id,
  })

  const updateData: any = {}
  if (habilitado !== undefined) updateData.habilitado = habilitado
  if (porcentaje_costo !== undefined) updateData.porcentaje_costo = parseFloat(String(porcentaje_costo)) || 0

  if (existentes.length > 0) {
    await svc.updateMayoristaMedioPagos({ id: existentes[0].id, ...updateData })
  } else {
    await svc.createMayoristaMedioPagos({
      mayorista_id: payload.mayorista_id,
      medio_pago_id,
      habilitado: habilitado ?? true,
      porcentaje_costo: parseFloat(String(porcentaje_costo)) || 0,
    })
  }

  return res.json({ ok: true })
}
