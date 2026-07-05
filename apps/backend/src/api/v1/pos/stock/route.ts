import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { getPool } from "../../../../lib/db-seq"

function getComercioId(req: MedusaRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const decoded: any = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    return decoded.comercio_id || null
  } catch { return null }
}

// PUT /api/v1/pos/stock
// Body: { items: [{ ean: "7790...", cantidad: -1 }] }
// Descuenta stock de las presentaciones del catálogo unificado.
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const comercio_id = getComercioId(req)
  if (!comercio_id) return res.status(401).json({ error: "Token inválido o expirado" })

  const { items } = req.body as { items: { ean: string; cantidad: number }[] }
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items requerido" })

  const pool = getPool()
  const resultados: any[] = []

  for (const item of items) {
    const { rows } = await pool.query(`
      SELECT pmp.id, pmp.stock, pmp.precio, pp.nombre AS presentacion_nombre,
             p.nombre AS producto_nombre, pml.mayorista_id
      FROM producto_mayorista_presentacion pmp
      JOIN producto_mayorista_listing pml ON pml.id = pmp.listing_id
      JOIN producto_maestro_presentacion pp ON pp.id = pmp.presentacion_id
      JOIN producto_maestro p ON p.id = pml.producto_id
      WHERE (p.ean = $1 OR pp.ean_propio = $1)
        AND pmp.deleted_at IS NULL AND pmp.activo = true
        AND pml.deleted_at IS NULL AND pml.activo = true
        AND EXISTS (
          SELECT 1 FROM solicitud s
          WHERE s.mayorista_id = pml.mayorista_id AND s.comercio_id = $2
            AND s.estado = 'aceptado' AND s.deleted_at IS NULL
        )
    `, [item.ean, comercio_id])

    if (rows.length === 0) {
      resultados.push({ ean: item.ean, ok: false, error: "No encontrado o sin alta" })
      continue
    }

    for (const row of rows) {
      const nuevoStock = Math.max(0, (row.stock || 0) + item.cantidad)
      await pool.query(
        `UPDATE producto_mayorista_presentacion SET stock = $1, updated_at = now() WHERE id = $2`,
        [nuevoStock, row.id]
      )
    }
    resultados.push({ ean: item.ean, ok: true, presentaciones_actualizadas: rows.length })
  }

  res.json({ resultados })
}
