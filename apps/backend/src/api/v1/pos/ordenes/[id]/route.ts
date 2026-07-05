import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyApiKey } from "../../../../../lib/api-key"
import { getPool } from "../../../../../lib/db-seq"

// GET /api/v1/pos/ordenes/:id — detalle de una orden
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = await verifyApiKey(req as any, "nexopos")
  if (!apiKey) return res.status(401).json({ error: "API key inválida o inactiva" })

  const pool = getPool()
  const { id } = req.params

  const { rows: [orden] } = await pool.query(`
    SELECT o.id, o.numero, o.estado, o.total, o.notas, o.created_at,
           m.nombre AS mayorista_nombre, m.id AS mayorista_id
    FROM orden o
    JOIN mayorista m ON m.id = o.mayorista_id
    WHERE o.id = $1 AND o.comercio_id = $2 AND o.deleted_at IS NULL
  `, [id, apiKey.entidad_id])

  if (!orden) return res.status(404).json({ error: "Orden no encontrada" })

  const { rows: items } = await pool.query(`
    SELECT nombre, sku, ean, cantidad, precio_unitario, alicuota_iva, unidad, subtotal
    FROM orden_item WHERE orden_id = $1
  `, [id])

  res.json({ orden: { ...orden, items } })
}
