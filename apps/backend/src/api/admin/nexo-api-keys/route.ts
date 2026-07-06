import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPool } from "../../../lib/db-seq"
import { generarKey } from "../../../lib/api-key"

// GET /admin/nexo-api-keys
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { rows } = await pool.query(`
    SELECT id, nombre, tipo, entidad_id, activa, webhook_url, ultimo_uso, created_at,
           left(key, 12) || '...' AS key_preview
    FROM nexo_api_key
    WHERE deleted_at IS NULL AND tipo = 'mayorista'
    ORDER BY created_at DESC
  `)
  res.json({ api_keys: rows })
}

// POST /admin/nexo-api-keys
// Body: { nombre, entidad_id (mayorista_id), webhook_url? }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { nombre, entidad_id, webhook_url } = req.body as any

  if (!nombre || !entidad_id)
    return res.status(400).json({ error: "nombre y entidad_id (mayorista_id) son requeridos" })

  const key = generarKey("mayorista")

  const { rows: [row] } = await pool.query(`
    INSERT INTO nexo_api_key (key, nombre, tipo, entidad_id, webhook_url)
    VALUES ($1, $2, 'mayorista', $3, $4)
    RETURNING id, key, nombre, tipo, entidad_id, activa, webhook_url, created_at
  `, [key, nombre, entidad_id, webhook_url || null])

  res.status(201).json({ api_key: row, aviso: "Guarda esta key ahora, no se vuelve a mostrar completa." })
}
