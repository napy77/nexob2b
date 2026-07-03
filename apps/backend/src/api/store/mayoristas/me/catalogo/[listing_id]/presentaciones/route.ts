import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_LISTING_MODULE } from "../../../../../../../modules/producto-listing"
import { getPool } from "../../../../../../../lib/db-seq"

const getMayoristaId = (req: MedusaRequest): string | null => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null
  const jwt = require("jsonwebtoken")
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    return decoded.mayorista_id || null
  } catch { return null }
}

// POST /store/mayoristas/me/catalogo/:listing_id/presentaciones — activar presentación con precio/stock
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const svc: any = req.scope.resolve(PRODUCTO_LISTING_MODULE)
  const mayorista_id = getMayoristaId(req)
  if (!mayorista_id) return res.status(401).json({ error: "Sin autenticación" })

  const { listing_id } = req.params
  const body = req.body as any

  // Verificar que el listing pertenece a este mayorista
  const { rows: [listing] } = await pool.query(
    `SELECT id, producto_id FROM producto_mayorista_listing WHERE id = $1 AND mayorista_id = $2 AND deleted_at IS NULL`,
    [listing_id, mayorista_id]
  )
  if (!listing) return res.status(404).json({ error: "Listing no encontrado" })

  // Verificar que la presentacion pertenece al producto del listing
  const { rows: [pres] } = await pool.query(
    `SELECT id FROM producto_maestro_presentacion WHERE id = $1 AND producto_id = $2 AND deleted_at IS NULL`,
    [body.presentacion_id, listing.producto_id]
  )
  if (!pres) return res.status(400).json({ error: "La presentación no pertenece a este producto" })

  // Verificar si ya existe (puede estar soft-deleted)
  const { rows: [existing] } = await pool.query(
    `SELECT id FROM producto_mayorista_presentacion WHERE listing_id = $1 AND presentacion_id = $2`,
    [listing_id, body.presentacion_id]
  )

  let result: any
  if (existing) {
    // Reactivar y actualizar precio/stock
    await pool.query(
      `UPDATE producto_mayorista_presentacion SET precio = $1, precio_lista = $2, stock = $3, cantidad_minima = $4, activo = true, deleted_at = NULL, updated_at = now()
       WHERE id = $5`,
      [parseFloat(String(body.precio)), body.precio_lista ? parseFloat(String(body.precio_lista)) : null, parseInt(String(body.stock ?? 0)), parseInt(String(body.cantidad_minima ?? 1)), existing.id]
    )
    const { rows: [updated] } = await pool.query(`SELECT * FROM producto_mayorista_presentacion WHERE id = $1`, [existing.id])
    result = updated
  } else {
    result = await svc.createProductoMayoristaPresentacions({
      listing_id,
      presentacion_id: body.presentacion_id,
      precio: parseFloat(String(body.precio)),
      precio_lista: body.precio_lista ? parseFloat(String(body.precio_lista)) : null,
      stock: parseInt(String(body.stock ?? 0)),
      cantidad_minima: parseInt(String(body.cantidad_minima ?? 1)),
      activo: true,
    })
  }

  res.status(201).json({ presentacion: result })
}
