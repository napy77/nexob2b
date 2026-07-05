import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyApiKey } from "../../../../lib/api-key"
import { getPool } from "../../../../lib/db-seq"

// GET /api/v1/mayorista/ordenes?estado=pendiente&desde=2026-01-01
// Lista órdenes entrantes del mayorista autenticado.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = await verifyApiKey(req as any, "mayorista")
  if (!apiKey) return res.status(401).json({ error: "API key inválida o inactiva" })

  const pool = getPool()
  const mayorista_id = apiKey.entidad_id
  const { estado, desde } = req.query as Record<string, string>

  const conditions = ["o.mayorista_id = $1", "o.deleted_at IS NULL"]
  const params: any[] = [mayorista_id]
  let i = 2

  if (estado) { conditions.push(`o.estado = $${i++}`); params.push(estado) }
  if (desde)  { conditions.push(`o.created_at >= $${i++}`); params.push(desde) }

  const { rows } = await pool.query(`
    SELECT o.id, o.numero, o.estado, o.total, o.notas, o.created_at,
           c.nombre AS comercio_nombre, c.email AS comercio_email,
           c.telefono AS comercio_telefono,
           json_agg(json_build_object(
             'nombre', oi.nombre,
             'ean', oi.ean,
             'cantidad', oi.cantidad,
             'precio_unitario', oi.precio_unitario,
             'unidad', oi.unidad,
             'subtotal', oi.subtotal
           )) AS items
    FROM orden o
    JOIN comercio c ON c.id = o.comercio_id
    JOIN orden_item oi ON oi.orden_id = o.id
    WHERE ${conditions.join(" AND ")}
    GROUP BY o.id, c.nombre, c.email, c.telefono
    ORDER BY o.created_at DESC
    LIMIT 200
  `, params)

  res.json({ ordenes: rows })
}
