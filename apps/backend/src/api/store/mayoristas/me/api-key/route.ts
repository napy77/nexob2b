import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPool } from "../../../../../lib/db-seq"
import { generarKey } from "../../../../../lib/api-key"
import jwt from "jsonwebtoken"

function getMayoristaId(req: MedusaRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const decoded: any = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    return decoded.mayorista_id || null
  } catch { return null }
}

// GET /store/mayoristas/me/api-key — ver estado de la key (key preview, no completa)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mayorista_id = getMayoristaId(req)
  if (!mayorista_id) return res.status(401).json({ error: "Sin autenticación" })

  const pool = getPool()
  const { rows: [row] } = await pool.query(`
    SELECT id, nombre, activa, webhook_url, ultimo_uso, created_at,
           left(key, 12) || repeat('*', 20) AS key_preview
    FROM nexo_api_key
    WHERE entidad_id = $1 AND tipo = 'mayorista' AND deleted_at IS NULL
    LIMIT 1
  `, [mayorista_id])

  res.json({ nexo_api_key: row || null })
}

// POST /store/mayoristas/me/api-key — generar o regenerar key
// Body: { webhook_url?: string, nombre?: string }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const mayorista_id = getMayoristaId(req)
  if (!mayorista_id) return res.status(401).json({ error: "Sin autenticación" })

  const pool = getPool()
  const { webhook_url, nombre } = req.body as any
  const key = generarKey("mayorista")
  const keyNombre = nombre || "API Key principal"

  // Si ya tiene una, la reemplaza (soft delete + nueva)
  await pool.query(
    `UPDATE nexo_api_key SET deleted_at = now(), activa = false WHERE entidad_id = $1 AND tipo = 'mayorista' AND deleted_at IS NULL`,
    [mayorista_id]
  )

  const { rows: [row] } = await pool.query(`
    INSERT INTO nexo_api_key (key, nombre, tipo, entidad_id, webhook_url)
    VALUES ($1, $2, 'mayorista', $3, $4)
    RETURNING id, key, nombre, activa, webhook_url, created_at
  `, [key, keyNombre, mayorista_id, webhook_url || null])

  res.status(201).json({
    nexo_api_key: row,
    aviso: "Guarda esta key ahora, no se vuelve a mostrar completa.",
  })
}

// PUT /store/mayoristas/me/api-key — actualizar solo webhook_url
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const mayorista_id = getMayoristaId(req)
  if (!mayorista_id) return res.status(401).json({ error: "Sin autenticación" })

  const pool = getPool()
  const { webhook_url } = req.body as any
  const { rows: [row] } = await pool.query(`
    UPDATE nexo_api_key SET webhook_url = $1
    WHERE entidad_id = $2 AND tipo = 'mayorista' AND deleted_at IS NULL
    RETURNING id, nombre, activa, webhook_url
  `, [webhook_url || null, mayorista_id])

  if (!row) return res.status(404).json({ error: "No tenés API key generada aún" })
  res.json({ nexo_api_key: row })
}
