import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyApiKey } from "../../../../lib/api-key"
import { getPool } from "../../../../lib/db-seq"

// PUT /api/v1/pos/stock
// Body: { items: [{ ean: "7790...", cantidad: -1 }] }
// Descuenta stock de las presentaciones del catálogo unificado.
// Busca por EAN del producto maestro o EAN propio de la presentación.
// Solo afecta listings de mayoristas con alta en el comercio de esta API key.
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = await verifyApiKey(req as any, "nexopos")
  if (!apiKey) return res.status(401).json({ error: "API key inválida o inactiva" })

  const { items } = req.body as { items: { ean: string; cantidad: number }[] }
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items requerido" })

  const pool = getPool()
  const comercio_id = apiKey.entidad_id
  const resultados: any[] = []

  for (const item of items) {
    // Buscar presentaciones activas de este EAN en mayoristas con alta del comercio
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

    // Actualizar todas las presentaciones que matchean (puede haber más de un mayorista)
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
