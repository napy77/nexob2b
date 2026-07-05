import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPool } from "../../../../lib/db-seq"

// PUT /api/admin/api-keys/:id — togglear activa o cambiar webhook_url
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { activa, webhook_url } = req.body as any
  const sets: string[] = []
  const vals: any[] = []
  let i = 1

  if (activa != null) { sets.push(`activa = $${i++}`); vals.push(activa) }
  if (webhook_url !== undefined) { sets.push(`webhook_url = $${i++}`); vals.push(webhook_url || null) }
  if (sets.length === 0) return res.status(400).json({ error: "Nada para actualizar" })

  vals.push(req.params.id)
  const { rows: [row] } = await pool.query(
    `UPDATE api_key SET ${sets.join(", ")} WHERE id = $${i} AND deleted_at IS NULL RETURNING id, nombre, tipo, activa, webhook_url`,
    vals
  )
  if (!row) return res.status(404).json({ error: "No encontrada" })
  res.json({ api_key: row })
}

// DELETE /api/admin/api-keys/:id — soft delete
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { rowCount } = await pool.query(
    `UPDATE api_key SET deleted_at = now(), activa = false WHERE id = $1 AND deleted_at IS NULL`,
    [req.params.id]
  )
  if (!rowCount) return res.status(404).json({ error: "No encontrada" })
  res.json({ ok: true })
}
