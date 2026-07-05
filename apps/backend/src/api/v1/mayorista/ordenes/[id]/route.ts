import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyApiKey } from "../../../../../lib/api-key"
import { getPool } from "../../../../../lib/db-seq"

const ESTADOS_VALIDOS = ["confirmado", "preparando", "despachado", "entregado", "cancelado"]

// GET /api/v1/mayorista/ordenes/:id
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = await verifyApiKey(req as any, "mayorista")
  if (!apiKey) return res.status(401).json({ error: "API key inválida o inactiva" })

  const pool = getPool()
  const { rows: [orden] } = await pool.query(`
    SELECT o.id, o.numero, o.estado, o.total, o.notas, o.created_at,
           c.nombre AS comercio_nombre, c.email AS comercio_email, c.telefono AS comercio_telefono
    FROM orden o JOIN comercio c ON c.id = o.comercio_id
    WHERE o.id = $1 AND o.mayorista_id = $2 AND o.deleted_at IS NULL
  `, [req.params.id, apiKey.entidad_id])

  if (!orden) return res.status(404).json({ error: "Orden no encontrada" })

  const { rows: items } = await pool.query(
    `SELECT nombre, ean, cantidad, precio_unitario, unidad, subtotal FROM orden_item WHERE orden_id = $1`,
    [req.params.id]
  )
  res.json({ orden: { ...orden, items } })
}

// PUT /api/v1/mayorista/ordenes/:id
// Body: { estado: "confirmado" | "preparando" | "despachado" | "entregado" | "cancelado" }
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = await verifyApiKey(req as any, "mayorista")
  if (!apiKey) return res.status(401).json({ error: "API key inválida o inactiva" })

  const { estado } = req.body as { estado: string }
  if (!ESTADOS_VALIDOS.includes(estado))
    return res.status(400).json({ error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(", ")}` })

  const pool = getPool()
  const { rows: [orden] } = await pool.query(
    `SELECT id FROM orden WHERE id = $1 AND mayorista_id = $2 AND deleted_at IS NULL`,
    [req.params.id, apiKey.entidad_id]
  )
  if (!orden) return res.status(404).json({ error: "Orden no encontrada" })

  await pool.query(
    `UPDATE orden SET estado = $1, updated_at = now() WHERE id = $2`,
    [estado, req.params.id]
  )

  res.json({ ok: true, id: req.params.id, estado })
}
