import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { TRANSPORTE_MODULE } from "../../../../../modules/transporte"

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

// GET /store/mayoristas/me/transportes
// Devuelve todos los tipos globales activos con config del mayorista
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)

  const [globales, configurados] = await Promise.all([
    svc.listTransportes({ activo: true }, { order: { orden: "ASC" } }),
    svc.listMayoristaTransportes({ mayorista_id: payload.mayorista_id }),
  ])

  const configMap = new Map<string, any>(configurados.map((c: any) => [c.transporte_id, c]))

  const transportes = globales.map((t: any) => {
    const config: any = configMap.get(t.id)
    return {
      ...t,
      habilitado: config ? config.habilitado : false, // por defecto deshabilitado hasta que el mayorista lo active
      porcentaje_costo: config && config.porcentaje_costo != null
        ? parseFloat(String(config.porcentaje_costo))
        : parseFloat(String(t.porcentaje_costo)) || 0,
    }
  })

  return res.json({ transportes })
}

// PUT /store/mayoristas/me/transportes
// Body: { transporte_id, habilitado, porcentaje_costo }
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { transporte_id, habilitado, porcentaje_costo } = req.body as any
  if (!transporte_id) return res.status(400).json({ error: "transporte_id requerido" })

  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)

  const existentes = await svc.listMayoristaTransportes({
    mayorista_id: payload.mayorista_id,
    transporte_id,
  })

  const updateData: any = {}
  if (habilitado !== undefined) updateData.habilitado = habilitado
  if (porcentaje_costo !== undefined) updateData.porcentaje_costo = parseFloat(String(porcentaje_costo)) || 0

  if (existentes.length > 0) {
    await svc.updateMayoristaTransportes({ id: existentes[0].id, ...updateData })
  } else {
    await svc.createMayoristaTransportes({
      mayorista_id: payload.mayorista_id,
      transporte_id,
      habilitado: habilitado ?? true,
      porcentaje_costo: parseFloat(String(porcentaje_costo)) || 0,
    })
  }

  return res.json({ ok: true })
}
