import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SOLICITUD_MODULE } from "../../../../../modules/solicitud"
import jwt from "jsonwebtoken"

// PUT /store/mayoristas/contactos/:id — mayorista acepta o rechaza solicitud
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const auth = req.headers.authorization?.replace("Bearer ", "")
    if (!auth) return res.status(401).json({ error: "No autorizado" })

    let payload: any
    try {
      payload = jwt.verify(auth, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    } catch {
      return res.status(401).json({ error: "Token inválido" })
    }

    const mayoristaId = payload.mayorista_id
    const { id } = req.params
    const { estado } = req.body as any

    if (!["aceptado", "rechazado", "pendiente"].includes(estado)) {
      return res.status(400).json({ error: "estado inválido" })
    }

    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)
    const solicitud = await solicitudService.retrieveSolicitud(id)

    if (solicitud.mayorista_id !== mayoristaId) {
      return res.status(403).json({ error: "Sin permiso" })
    }

    const updated = await solicitudService.updateSolicituds({ id, estado })
    return res.json({ solicitud: updated })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
