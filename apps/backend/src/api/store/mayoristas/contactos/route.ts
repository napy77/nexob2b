import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SOLICITUD_MODULE } from "../../../../modules/solicitud"
import { COMERCIO_MODULE } from "../../../../modules/comercio"
import jwt from "jsonwebtoken"

// GET /store/mayoristas/contactos — mayorista ve sus contactos
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

    const mayoristaId = payload.mayorista_id
    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)
    const comercioService: any = req.scope.resolve(COMERCIO_MODULE)

    const { estado } = req.query as any
    const filtro: any = { mayorista_id: mayoristaId }
    if (estado) filtro.estado = estado

    const solicitudes = await solicitudService.listSolicituds(filtro, { order: { created_at: "DESC" } })

    // Enriquecer con datos del comercio
    const enriquecidas = await Promise.all(
      solicitudes.map(async (s: any) => {
        try {
          const comercio = await comercioService.retrieveComercio(s.comercio_id, {
            select: ["id", "nombre", "cuit", "email", "telefono", "ciudad", "provincia", "rubros"],
          })
          return { ...s, comercio }
        } catch {
          return { ...s, comercio: null }
        }
      })
    )

    return res.json({ contactos: enriquecidas })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
