import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { PRODUCTO_MODULE } from "../../../../../modules/producto"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import { SOLICITUD_MODULE } from "../../../../../modules/solicitud"
import jwt from "jsonwebtoken"

// GET /store/mayoristas/:id/catalogo — comercio con relación aceptada ve productos
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
    const { id: mayoristaId } = req.params

    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)
    const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
    const productoService: any = req.scope.resolve(PRODUCTO_MODULE)

    // Verificar relación aceptada
    const solicitudes = await solicitudService.listSolicituds({
      comercio_id: comercioId,
      mayorista_id: mayoristaId,
      estado: "aceptado",
    })

    if (solicitudes.length === 0) {
      return res.status(403).json({ error: "Sin acceso. Solicitá alta con este mayorista." })
    }

    // Datos del mayorista
    const mayorista = await mayoristaService.retrieveMayorista(mayoristaId, {
      select: ["id", "nombre", "email", "telefono", "ciudad", "provincia", "rubros"],
    })

    // Productos activos
    const productos = await productoService.listProductos(
      { mayorista_id: mayoristaId, activo: true },
      { order: { pasillo: "ASC", nombre: "ASC" } }
    )

    return res.json({ mayorista, productos })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
