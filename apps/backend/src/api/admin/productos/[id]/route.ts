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
  const pool = getPool()
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const { id } = req.params
  const body = req.body as any

  // Campos que el servicio Medusa maneja (están en el modelo)
  const camposMedusa = ["nombre", "descripcion", "marca", "unidad_base", "alicuota_iva", "ean"]
  const updatesMedusa: Record<string, any> = {}
  for (const c of camposMedusa) {
    if (body[c] !== undefined) updatesMedusa[c] = body[c]
  }
  if (Object.keys(updatesMedusa).length > 0) {
    await svc.updateProductos({ id }, updatesMedusa)
  }

  // Campos que el servicio Medusa ignora → SQL directo
  const setClauses: string[] = ["updated_at = now()"]
  const sqlParams: any[] = []
  let pi = 1

  if (body.pasillo_id !== undefined) {
    setClauses.push(`pasillo_id = $${pi++}`)
    sqlParams.push(body.pasillo_id || null)
  }
  if (body.rubro_id !== undefined) {
    setClauses.push(`rubro_id = $${pi++}`)
    sqlParams.push(body.rubro_id || null)
  }
  if (body.subrubro_id !== undefined) {
    setClauses.push(`subrubro_id = $${pi++}`)
    sqlParams.push(body.subrubro_id || null)
  }
  if (body.imagen_url_base64) {
    setClauses.push(`imagen_url = $${pi++}`)
    sqlParams.push(body.imagen_url_base64)
  }

  sqlParams.push(id)
  await pool.query(
    `UPDATE producto_maestro SET ${setClauses.join(", ")} WHERE id = $${pi}`,
    sqlParams
  )

  // Releer el producto actualizado
  const { rows: [producto] } = await pool.query(`
    SELECT p.*,
      pa.nombre AS pasillo_nombre,
      ru.nombre AS rubro_nombre,
      sr.nombre AS subrubro_nombre
    FROM producto_maestro p
    LEFT JOIN pasillo pa ON pa.id = p.pasillo_id
    LEFT JOIN rubro ru ON ru.id = p.rubro_id
    LEFT JOIN subrubro sr ON sr.id = p.subrubro_id
    WHERE p.id = $1
  `, [id])

  res.json({ producto })
}

// DELETE /admin/productos/:id (soft delete)
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const { id } = req.params
  await svc.deleteProductos(id)
  res.json({ success: true })
}
