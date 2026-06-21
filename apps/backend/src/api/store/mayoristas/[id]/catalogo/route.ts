import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { PRODUCTO_MODULE } from "../../../../../modules/producto"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import { SOLICITUD_MODULE } from "../../../../../modules/solicitud"
import jwt from "jsonwebtoken"

// GET /store/mayoristas/:id/catalogo
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

    // Datos del mayorista
    const mayorista = await mayoristaService.retrieveMayorista(mayoristaId, {
      select: ["id", "nombre", "email", "telefono", "ciudad", "provincia", "rubros", "visibilidad", "descripcion"],
    })

    const visibilidad: string = mayorista.visibilidad || "sin_precio"

    // Verificar si tiene relación aceptada
    const solicitudes = await solicitudService.listSolicituds({
      comercio_id: comercioId,
      mayorista_id: mayoristaId,
    })
    const solicitud = solicitudes[0] || null
    const aceptado = solicitud?.estado === "aceptado"

    // Productos activos
    const productos = await productoService.listProductos(
      { mayorista_id: mayoristaId, activo: true },
      { order: { pasillo: "ASC", nombre: "ASC" } }
    )

    // Aplicar reglas de visibilidad
    // - publico: todos ven precios y pueden contactar
    // - con_precio: todos ven precios, contacto solo si aceptado
    // - sin_precio: precios ocultos hasta ser aceptado
    const mostrarPrecio = visibilidad === "publico" || visibilidad === "con_precio" || aceptado
    const puedeContactar = visibilidad === "publico" || aceptado

    const productosResponse = productos.map((p: any) => ({
      ...p,
      precio: mostrarPrecio ? p.precio : null,
    }))

    return res.json({
      mayorista,
      productos: productosResponse,
      acceso: {
        visibilidad,
        aceptado,
        mostrarPrecio,
        puedeContactar,
        solicitud,
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
