import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { getPool } from "../../../../../lib/db-seq"

function getComercioId(req: MedusaRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const decoded: any = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    return decoded.comercio_id || null
  } catch { return null }
}

// GET /api/v1/pos/ordenes/:id
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const comercio_id = getComercioId(req)
  if (!comercio_id) return res.status(401).json({ error: "Token inválido o expirado" })

  const pool = getPool()
  const { rows: [orden] } = await pool.query(`
    SELECT o.id, o.numero, o.estado, o.total, o.notas, o.created_at,
           m.nombre AS mayorista_nombre, m.id AS mayorista_id
    FROM orden o
    JOIN mayorista m ON m.id = o.mayorista_id
    WHERE o.id = $1 AND o.comercio_id = $2 AND o.deleted_at IS NULL
  `, [req.params.id, comercio_id])

  if (!orden) return res.status(404).json({ error: "Orden no encontrada" })

  const { rows: items } = await pool.query(`
    SELECT nombre, sku, ean, cantidad, precio_unitario, alicuota_iva, unidad, subtotal
    FROM orden_item WHERE orden_id = $1
  `, [req.params.id])

  res.json({ orden: { ...orden, items } })
}
