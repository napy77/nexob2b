import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { MEDIO_PAGO_MODULE } from "../../../../../../../modules/medio_pago"

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

// GET /store/mayoristas/me/contactos/:comercioId/medios-pago
// Devuelve los medios globales del mayorista con flag habilitado específico para este comercio
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { comercioId } = req.params
  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)

  // 1. Medios globales activos
  const [globales, configMayorista, configContacto] = await Promise.all([
    svc.listMedioPagos({ activo: true }, { order: { orden: "ASC" } }),
    svc.listMayoristaMedioPagos({ mayorista_id: payload.mayorista_id }),
    svc.listContactoMedioPagos({ mayorista_id: payload.mayorista_id, comercio_id: comercioId }),
  ])

  // Mapa global del mayorista
  const globalMap = new Map(configMayorista.map((c: any) => [c.medio_pago_id, c.habilitado]))
  // Mapa específico del contacto
  const contactoMap = new Map(configContacto.map((c: any) => [c.medio_pago_id, c.habilitado]))

  const medios = globales.map((m: any) => {
    const habilitadoGlobal = globalMap.has(m.id) ? globalMap.get(m.id) : true
    // Si está deshabilitado globalmente → no se puede habilitar para el contacto
    const habilitadoContacto = habilitadoGlobal
      ? (contactoMap.has(m.id) ? contactoMap.get(m.id) : true)
      : false

    return {
      ...m,
      habilitado_global: habilitadoGlobal,
      habilitado: habilitadoContacto,
    }
  })

  return res.json({ medios_pago: medios })
}

// PUT /store/mayoristas/me/contactos/:comercioId/medios-pago
// Body: { medio_pago_id, habilitado }
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { comercioId } = req.params
  const { medio_pago_id, habilitado } = req.body as any
  if (!medio_pago_id) return res.status(400).json({ error: "medio_pago_id requerido" })

  const svc: any = req.scope.resolve(MEDIO_PAGO_MODULE)

  // Verificar que esté habilitado globalmente antes de habilitar para el contacto
  if (habilitado) {
    const globalConf = await svc.listMayoristaMedioPagos({
      mayorista_id: payload.mayorista_id, medio_pago_id
    })
    const habilitadoGlobal = globalConf.length > 0 ? globalConf[0].habilitado : true
    if (!habilitadoGlobal) {
      return res.status(400).json({ error: "No podés habilitar un medio deshabilitado globalmente" })
    }
  }

  const existentes = await svc.listContactoMedioPagos({
    mayorista_id: payload.mayorista_id,
    comercio_id: comercioId,
    medio_pago_id,
  })

  if (existentes.length > 0) {
    await svc.updateContactoMedioPagos({ id: existentes[0].id, habilitado })
  } else {
    await svc.createContactoMedioPagos({
      mayorista_id: payload.mayorista_id,
      comercio_id: comercioId,
      medio_pago_id,
      habilitado,
    })
  }

  return res.json({ ok: true })
}
