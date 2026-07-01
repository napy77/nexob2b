/**
 * POST   /store/mayoristas/me/listas-precio/:listaId/items   → upsert item (precio fijo por producto)
 * DELETE /store/mayoristas/me/listas-precio/:listaId/items   → eliminar item (?producto_id=xxx)
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { getPool } from "../../../../../../../lib/db-seq"

function verifyMayorista(req: MedusaRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const p = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as any
    if (!p.mayorista_id || p.rol === "vendedor") return null
    return p.mayorista_id
  } catch { return null }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { listaId } = req.params
  const { producto_id, precio_fijo } = req.body as any

  if (!producto_id || precio_fijo == null) {
    return res.status(400).json({ error: "producto_id y precio_fijo son requeridos" })
  }

  const pool = getPool()

  // Verificar que la lista pertenece a este mayorista
  const { rows: [lista] } = await pool.query(
    `SELECT id FROM lista_precio WHERE id = $1 AND mayorista_id = $2`,
    [listaId, mayorista_id]
  )
  if (!lista) return res.status(404).json({ error: "Lista no encontrada" })

  const { rows } = await pool.query(
    `INSERT INTO lista_precio_item (lista_id, producto_id, precio_fijo)
     VALUES ($1, $2, $3)
     ON CONFLICT (lista_id, producto_id) DO UPDATE SET precio_fijo = EXCLUDED.precio_fijo
     RETURNING *`,
    [listaId, producto_id, precio_fijo]
  )
  return res.json({ item: { ...rows[0], precio_fijo: parseFloat(rows[0].precio_fijo) } })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { listaId } = req.params
  const producto_id = req.query.producto_id as string

  if (!producto_id) return res.status(400).json({ error: "producto_id requerido" })

  const pool = getPool()

  // Verificar que la lista pertenece a este mayorista
  const { rows: [lista] } = await pool.query(
    `SELECT id FROM lista_precio WHERE id = $1 AND mayorista_id = $2`,
    [listaId, mayorista_id]
  )
  if (!lista) return res.status(404).json({ error: "Lista no encontrada" })

  await pool.query(
    `DELETE FROM lista_precio_item WHERE lista_id = $1 AND producto_id = $2`,
    [listaId, producto_id]
  )
  return res.json({ ok: true })
}
