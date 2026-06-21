import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SOLICITUD_MODULE } from "../../../modules/solicitud"
import { COMERCIO_MODULE } from "../../../modules/comercio"
import jwt from "jsonwebtoken"

// POST /store/solicitudes — comercio solicita alta con un mayorista
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const auth = req.headers.authorization?.replace("Bearer ", "")
    if (!auth) return res.status(401).json({ error: "No autorizado" })

    let payload: any
    try {
      payload = jwt.verify(auth, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    } catch {
      return res.status(401).json({ error: "Token inválido" })
    }

    const comercioId = payload.comercio_id
    const { mayorista_id, mensaje } = req.body as any

    if (!mayorista_id) return res.status(400).json({ error: "mayorista_id requerido" })

    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)

    // Verificar que no exista ya una solicitud
    const existing = await solicitudService.listSolicituds({
      comercio_id: comercioId,
      mayorista_id,
    })

    if (existing.length > 0) {
      return res.status(409).json({ error: "Ya existe una solicitud con este mayorista", solicitud: existing[0] })
    }

    const solicitud = await solicitudService.createSolicituds({
      comercio_id: comercioId,
      mayorista_id,
      mensaje: mensaje || null,
      estado: "pendiente",
    })

    return res.json({ solicitud })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}

// GET /store/solicitudes — comercio ve sus solicitudes
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const auth = req.headers.authorization?.replace("Bearer ", "")
    if (!auth) return res.status(401).json({ error: "No autorizado" })

    let payload: any
    try {
      payload = jwt.verify(auth, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    } catch {
      return res.status(401).json({ error: "Token inválido" })
    }

    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)
    const solicitudes = await solicitudService.listSolicituds(
      { comercio_id: payload.comercio_id },
      { order: { created_at: "DESC" } }
    )

    return res.json({ solicitudes })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
