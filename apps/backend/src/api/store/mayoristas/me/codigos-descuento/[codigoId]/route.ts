/**
 * PUT    /store/mayoristas/me/codigos-descuento/:codigoId  → editar
 * DELETE /store/mayoristas/me/codigos-descuento/:codigoId  → eliminar
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { getPool } from "../../../../../../lib/db-seq"

function verifyMayorista(req: MedusaRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const p = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as any
    if (!p.mayorista_id || p.rol === "vendedor") return null
    return p.mayorista_id
  } catch { return null }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { codigoId } = req.params
  const { codigo, tipo, valor, uso_maximo, fecha_vencimiento, activo } = req.body as any
  const pool = getPool()

  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  if (codigo !== undefined) { fields.push(`codigo = UPPER($${idx++})`); values.push(codigo) }
  if (tipo !== undefined) { fields.push(`tipo = $${idx++}`); values.push(tipo) }
  if (valor !== undefined) { fields.push(`valor = $${idx++}`); values.push(valor) }
  if (uso_maximo !== undefined) { fields.push(`uso_maximo = $${idx++}`); values.push(uso_maximo || null) }
  if (fecha_vencimiento !== undefined) { fields.push(`fecha_vencimiento = $${idx++}`); values.push(fecha_vencimiento || null) }
  if (activo !== undefined) { fields.push(`activo = $${idx++}`); values.push(activo) }

  if (!fields.length) return res.status(400).json({ error: "Nada que actualizar" })

  values.push(codigoId, mayorista_id)
  const { rows } = await pool.query(
    `UPDATE codigo_descuento SET ${fields.join(", ")} WHERE id = $${idx++} AND mayorista_id = $${idx} RETURNING *`,
    values
  )
  if (!rows[0]) return res.status(404).json({ error: "Código no encontrado" })

  return res.json({ codigo: { ...rows[0], valor: parseFloat(rows[0].valor) } })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { codigoId } = req.params
  const pool = getPool()

  // Nullificar referencias en órdenes antes de eliminar
  await pool.query(
    `UPDATE "orden" SET codigo_descuento_id = NULL WHERE codigo_descuento_id = $1`,
    [codigoId]
  )

  const { rows } = await pool.query(
    `DELETE FROM codigo_descuento WHERE id = $1 AND mayorista_id = $2 RETURNING id`,
    [codigoId, mayorista_id]
  )
  if (!rows[0]) return res.status(404).json({ error: "Código no encontrado" })

  return res.json({ ok: true })
}
