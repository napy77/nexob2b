import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SOLICITUD_MODULE } from "../../../../../modules/solicitud"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import jwt from "jsonwebtoken"

const verify = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization?.replace("Bearer ", "")
  if (!auth) return null
  try { return jwt.verify(auth, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string } }
  catch { return null }
}

// PUT /store/mayoristas/contactos/:id — cambia estado y/o vendedor asignado
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const p = verify(req)
    if (!p) return res.status(401).json({ error: "No autorizado" })

    const { id } = req.params
    const { estado, vendedor_id } = req.body as any

    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)
    const solicitud = await solicitudService.retrieveSolicitud(id)
    if (solicitud.mayorista_id !== p.mayorista_id) {
      return res.status(403).json({ error: "Sin permiso" })
    }

    const update: Record<string, any> = { id }

    if (estado !== undefined) {
      if (!["aceptado", "rechazado", "pendiente"].includes(estado)) {
        return res.status(400).json({ error: "estado inválido" })
      }
      update.estado = estado
    }

    if (vendedor_id !== undefined) {
      // null para desasignar; si viene un id, verificar que pertenece al mayorista
      if (vendedor_id === null) {
        update.vendedor_id = null
      } else {
        const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
        const vendedor = await mayoristaService.retrieveVendedor(vendedor_id).catch(() => null)
        if (!vendedor || vendedor.mayorista_id !== p.mayorista_id) {
          return res.status(400).json({ error: "Vendedor inválido" })
        }
        update.vendedor_id = vendedor_id
      }
    }

    const updated = await solicitudService.updateSolicituds(update)
    return res.json({ solicitud: updated })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
