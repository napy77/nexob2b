import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import { SOLICITUD_MODULE } from "../../../../../modules/solicitud"
import { COMERCIO_MODULE } from "../../../../../modules/comercio"
import jwt from "jsonwebtoken"

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
  } catch {
    return null
  }
}

// GET /store/mayoristas/me/mapa
// Devuelve: comercios con geo + vendedores con posición live
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const solicitudSvc: any = req.scope.resolve(SOLICITUD_MODULE)
  const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)
  const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)

  // Comercios aceptados con su vendedor asignado
  const solicitudes = await solicitudSvc.listSolicituds({
    mayorista_id: payload.mayorista_id,
    estado: "aceptado",
  })

  const comercioIds = solicitudes.map((s: any) => s.comercio_id)
  const vendedorIds = [...new Set(solicitudes.filter((s: any) => s.vendedor_id).map((s: any) => s.vendedor_id))]

  const todosComercio = comercioIds.length > 0 ? await comercioSvc.listComercios({}) : []
  const comercios = todosComercio
    .filter((c: any) => comercioIds.includes(c.id))
    .map((c: any) => {
      const sol = solicitudes.find((s: any) => s.comercio_id === c.id)
      return {
        id: c.id,
        nombre: c.nombre,
        ciudad: c.ciudad,
        provincia: c.provincia,
        telefono: c.telefono,
        email: c.email,
        direccion: c.direccion || null,
        lat: c.lat || null,
        lng: c.lng || null,
        vendedor_id: sol?.vendedor_id || null,
      }
    })

  // Vendedores con posición GPS
  const vendedores = vendedorIds.length > 0
    ? (await mayoristaService.listVendedors({ mayorista_id: payload.mayorista_id, activo: true }))
        .filter((v: any) => vendedorIds.includes(v.id))
        .map((v: any) => ({
          id: v.id,
          nombre: `${v.nombre} ${v.apellido}`,
          celular: v.celular,
          lat: v.lat || null,
          lng: v.lng || null,
          ultima_ubicacion: v.ultima_ubicacion || null,
        }))
    : []

  return res.json({ comercios, vendedores })
}
