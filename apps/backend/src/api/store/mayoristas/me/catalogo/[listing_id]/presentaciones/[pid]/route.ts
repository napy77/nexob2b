import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_LISTING_MODULE } from "../../../../../../../../modules/producto-listing"
import { getPool } from "../../../../../../../../lib/db-seq"

const getMayoristaId = (req: MedusaRequest): string | null => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null
  const jwt = require("jsonwebtoken")
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    return decoded.mayorista_id || null
  } catch { return null }
}

// PUT /store/mayoristas/me/catalogo/:listing_id/presentaciones/:pid
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const mayorista_id = getMayoristaId(req)
  if (!mayorista_id) return res.status(401).json({ error: "Sin autenticación" })

  const { listing_id, pid } = req.params
  const body = req.body as any

  // Verificar pertenencia
  const { rows: [mp] } = await pool.query(`
    SELECT pmp.id FROM producto_mayorista_presentacion pmp
    JOIN producto_mayorista_listing pml ON pml.id = pmp.listing_id
    WHERE pmp.id = $1 AND pml.mayorista_id = $2 AND pml.id = $3 AND pmp.deleted_at IS NULL
  `, [pid, mayorista_id, listing_id])
  if (!mp) return res.status(404).json({ error: "No encontrado" })

  const precio = body.precio !== undefined ? parseFloat(String(body.precio)) : null
  const precio_lista = body.precio_lista ? parseFloat(String(body.precio_lista)) : null
  const stock = body.stock !== undefined ? parseInt(String(body.stock)) : 0
  const cantidad_minima = body.cantidad_minima !== undefined ? parseInt(String(body.cantidad_minima)) : 1
  const activo = body.activo !== undefined ? !!body.activo : true

  await pool.query(
    `UPDATE producto_mayorista_presentacion
     SET precio = $1, precio_lista = $2, stock = $3, cantidad_minima = $4, activo = $5, updated_at = now()
     WHERE id = $6`,
    [precio, precio_lista, stock, cantidad_minima, activo, pid]
  )

  const { rows: [updated] } = await pool.query(
    `SELECT * FROM producto_mayorista_presentacion WHERE id = $1`, [pid]
  )
  res.json({ presentacion: updated })
}

// DELETE /store/mayoristas/me/catalogo/:listing_id/presentaciones/:pid
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const svc: any = req.scope.resolve(PRODUCTO_LISTING_MODULE)
  const mayorista_id = getMayoristaId(req)
  if (!mayorista_id) return res.status(401).json({ error: "Sin autenticación" })

  const { listing_id, pid } = req.params
  const { rows: [mp] } = await pool.query(`
    SELECT pmp.id FROM producto_mayorista_presentacion pmp
    JOIN producto_mayorista_listing pml ON pml.id = pmp.listing_id
    WHERE pmp.id = $1 AND pml.mayorista_id = $2 AND pml.id = $3
  `, [pid, mayorista_id, listing_id])
  if (!mp) return res.status(404).json({ error: "No encontrado" })

  await svc.deleteProductoMayoristaPresentacions(pid)
  res.json({ success: true })
}
