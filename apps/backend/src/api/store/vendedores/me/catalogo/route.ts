import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import { PRODUCTO_MODULE } from "../../../../../modules/producto"
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

// GET /store/vendedores/me/catalogo — catálogo del mayorista para el que trabaja el vendedor
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
  const productoService: any = req.scope.resolve(PRODUCTO_MODULE)

  const mayorista = await mayoristaService.retrieveMayorista(payload.mayorista_id, {
    select: ["id", "nombre", "email", "telefono", "logo_url"],
  })

  const { busqueda, pasillo } = req.query as any

  let productos = await productoService.listProductos(
    { mayorista_id: payload.mayorista_id, activo: true },
    { order: { pasillo: "ASC", nombre: "ASC" } }
  )

  if (busqueda) {
    const b = (busqueda as string).toLowerCase()
    productos = productos.filter((p: any) =>
      p.nombre?.toLowerCase().includes(b) ||
      p.pasillo?.toLowerCase().includes(b) ||
      p.rubro?.toLowerCase().includes(b)
    )
  }
  if (pasillo) {
    productos = productos.filter((p: any) =>
      p.pasillo?.toLowerCase().includes((pasillo as string).toLowerCase())
    )
  }

  return res.json({ mayorista, productos })
}
