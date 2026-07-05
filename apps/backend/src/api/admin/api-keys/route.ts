import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPool } from "../../../lib/db-seq"
import { generarKey } from "../../../lib/api-key"

// GET /api/admin/api-keys?tipo=nexopos|mayorista
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { tipo } = req.query as Record<string, string>
  const conditions = ["deleted_at IS NULL"]
  const params: any[] = []
  if (tipo) { conditions.push(`tipo = $1`); params.push(tipo) }

  const { rows } = await pool.query(`
    SELECT id, nombre, tipo, entidad_id, activa, webhook_url, ultimo_uso, created_at,
           -- mostrar solo primeros 12 chars de la key por seguridad
           left(key, 12) || '...' AS key_preview
    FROM nexo_api_key WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC
  `, params)

  res.json({ nexo_api_keys: rows })
}

// POST /api/admin/api-keys
// Body: { nombre, tipo: "nexopos"|"mayorista", entidad_id, webhook_url? }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { nombre, tipo, entidad_id, webhook_url } = req.body as any

  if (!nombre || !tipo || !entidad_id)
    return res.status(400).json({ error: "nombre, tipo y entidad_id son requeridos" })
  if (!["nexopos", "mayorista"].includes(tipo))
    return res.status(400).json({ error: "tipo debe ser nexopos o mayorista" })

  const key = generarKey(tipo)

  const { rows: [row] } = await pool.query(`
    INSERT INTO nexo_api_key (key, nombre, tipo, entidad_id, webhook_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, key, nombre, tipo, entidad_id, activa, webhook_url, created_at
  `, [key, nombre, tipo, entidad_id, webhook_url || null])

  // ÚNICA vez que se devuelve la key completa — el admin debe copiarla ahora
  res.status(201).json({ nexo_api_key: row, aviso: "Guarda esta key ahora, no se vuelve a mostrar completa." })
}
