import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_MAESTRO_MODULE } from "../../../../modules/producto-maestro"
import { getPool } from "../../../../lib/db-seq"

// GET /admin/productos/:id — producto con todas sus presentaciones
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { id } = req.params

  const { rows: [producto] } = await pool.query(`
    SELECT p.*,
      pa.nombre AS pasillo_nombre,
      ru.nombre AS rubro_nombre,
      sr.nombre AS subrubro_nombre
    FROM producto_maestro p
    LEFT JOIN pasillo pa ON pa.id = p.pasillo_id
    LEFT JOIN rubro ru ON ru.id = p.rubro_id
    LEFT JOIN subrubro sr ON sr.id = p.subrubro_id
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id])

  if (!producto) return res.status(404).json({ error: "Producto no encontrado" })

  const { rows: presentaciones } = await pool.query(`
    SELECT * FROM producto_maestro_presentacion
    WHERE producto_id = $1 AND deleted_at IS NULL
    ORDER BY orden ASC, factor ASC
  `, [id])

  const { rows: listings } = await pool.query(`
    SELECT pml.*, m.nombre AS mayorista_nombre
    FROM producto_mayorista_listing pml
    JOIN mayorista m ON m.id = pml.mayorista_id
    WHERE pml.producto_id = $1 AND pml.deleted_at IS NULL
  `, [id])

  res.json({ producto: { ...producto, presentaciones, listings } })
}

// PUT /admin/productos/:id
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const { id } = req.params
  const body = req.body as any

  const updates: Record<string, any> = {}
  const campos = ["nombre", "descripcion", "marca", "unidad_base", "alicuota_iva", "pasillo_id", "rubro_id", "subrubro_id", "ean"]
  for (const c of campos) {
    if (body[c] !== undefined) updates[c] = body[c]
  }

  const producto = await svc.updateProductos({ id }, updates)
  res.json({ producto })
}

// DELETE /admin/productos/:id (soft delete)
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const { id } = req.params
  await svc.deleteProductos(id)
  res.json({ success: true })
}
