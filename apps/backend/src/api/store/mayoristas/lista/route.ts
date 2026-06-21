import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import { SOLICITUD_MODULE } from "../../../../modules/solicitud"
import jwt from "jsonwebtoken"

// GET /store/mayoristas/lista — comercio ve mayoristas disponibles con estado de relación
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

    const comercioId = payload.comercio_id
    const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)

    // Todos los mayoristas aprobados
    const mayoristas = await mayoristaService.listMayoristas(
      { estado: "aprobado" },
      { select: ["id", "nombre", "email", "telefono", "ciudad", "provincia", "rubros", "zonas", "descripcion", "visibilidad"] }
    )

    // Solicitudes del comercio
    const solicitudes = await solicitudService.listSolicituds({ comercio_id: comercioId })
    const solicitudMap: Record<string, any> = {}
    solicitudes.forEach((s: any) => { solicitudMap[s.mayorista_id] = s })

    const resultado = mayoristas.map((m: any) => ({
      ...m,
      solicitud: solicitudMap[m.id] || null,
    }))

    return res.json({ mayoristas: resultado })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
