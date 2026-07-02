import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_LISTING_MODULE } from "../../../../../../modules/producto-listing"
import { getPool } from "../../../../../../lib/db-seq"

const getMayoristaId = (req: MedusaRequest): string | null => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null
  const jwt = require("jsonwebtoken")
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    return decoded.app_metadata?.mayorista_id || null
  } catch { return null }
}

// PUT /store/mayoristas/me/catalogo/:listing_id — actualizar descripción, tiempo entrega, etc.
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const svc: any = req.scope.resolve(PRODUCTO_LISTING_MODULE)
  const mayorista_id = getMayoristaId(req)
  if (!mayorista_id) return res.status(401).json({ error: "Sin autenticación" })

  const { listing_id } = req.params
  const { rows: [listing] } = await pool.query(
    `SELECT id FROM producto_mayorista_listing WHERE id = $1 AND mayorista_id = $2 AND deleted_at IS NULL`,
    [listing_id, mayorista_id]
  )
  if (!listing) return res.status(404).json({ error: "Listing no encontrado" })

  const body = req.body as any
  const updates: Record<string, any> = {}
  if (body.descripcion_propia !== undefined) updates.descripcion_propia = body.descripcion_propia
  if (body.notas !== undefined) updates.notas = body.notas
  if (body.tiempo_entrega_dias !== undefined) updates.tiempo_entrega_dias = body.tiempo_entrega_dias ? parseInt(body.tiempo_entrega_dias) : null
  if (body.activo !== undefined) updates.activo = !!body.activo

  const updated = await svc.updateProductoMayoristaListings({ id: listing_id }, updates)
  res.json({ listing: updated })
}

// DELETE /store/mayoristas/me/catalogo/:listing_id — sacar producto del catálogo
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const svc: any = req.scope.resolve(PRODUCTO_LISTING_MODULE)
  const mayorista_id = getMayoristaId(req)
  if (!mayorista_id) return res.status(401).json({ error: "Sin autenticación" })

  const { listing_id } = req.params
  const { rows: [listing] } = await pool.query(
    `SELECT id FROM producto_mayorista_listing WHERE id = $1 AND mayorista_id = $2 AND deleted_at IS NULL`,
    [listing_id, mayorista_id]
  )
  if (!listing) return res.status(404).json({ error: "Listing no encontrado" })

  await svc.deleteProductoMayoristaListings(listing_id)
  res.json({ success: true })
}
