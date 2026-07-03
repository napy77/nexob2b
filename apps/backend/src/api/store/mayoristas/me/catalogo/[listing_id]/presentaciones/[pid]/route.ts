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
  const svc: any = req.scope.resolve(PRODUCTO_LISTING_MODULE)
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

  const updates: Record<string, any> = {}
  if (body.precio !== undefined) updates.precio = parseFloat(String(body.precio))
  if (body.precio_lista !== undefined) updates.precio_lista = body.precio_lista ? parseFloat(String(body.precio_lista)) : null
  if (body.stock !== undefined) updates.stock = parseInt(String(body.stock))
  if (body.cantidad_minima !== undefined) updates.cantidad_minima = parseInt(String(body.cantidad_minima))
  if (body.activo !== undefined) updates.activo = !!body.activo

  const updated = await svc.updateProductoMayoristaPresentacions({ id: pid }, updates)
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
