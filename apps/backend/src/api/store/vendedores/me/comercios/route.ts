import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import { SOLICITUD_MODULE } from "../../../../../modules/solicitud"
import { COMERCIO_MODULE } from "../../../../../modules/comercio"
import jwt from "jsonwebtoken"

function verifyVendedor(req: MedusaRequest): { vendedor_id: string; mayorista_id: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const payload = jwt.verify(
      auth.split(" ")[1],
      process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
    ) as any
    if (payload.rol !== "vendedor") return null
    return { vendedor_id: payload.vendedor_id, mayorista_id: payload.mayorista_id }
  } catch {
    return null
  }
}

// GET /store/vendedores/me/comercios — comercios asignados a este vendedor
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)
  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)

  // Solicitudes aceptadas asignadas a este vendedor para este mayorista
  const solicitudes = await solicitudService.listSolicituds({
    vendedor_id: payload.vendedor_id,
    mayorista_id: payload.mayorista_id,
    estado: "aceptado",
  })

  if (solicitudes.length === 0) {
    return res.json({ comercios: [] })
  }

  const comercioIds = solicitudes.map((s: any) => s.comercio_id)
  const todosComercio = await comercioService.listComercios({})
  const comercios = todosComercio.filter((c: any) => comercioIds.includes(c.id))

  const resultado = comercios.map((c: any) => {
    const solicitud = solicitudes.find((s: any) => s.comercio_id === c.id)
    return {
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      ciudad: c.ciudad,
      provincia: c.provincia,
      cuit: c.cuit,
      estado: c.estado,
      solicitud_id: solicitud?.id,
    }
  })

  return res.json({ comercios: resultado })
}
