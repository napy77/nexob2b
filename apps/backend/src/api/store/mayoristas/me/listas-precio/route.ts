/**
 * GET  /store/mayoristas/me/listas-precio   → listar listas del mayorista
 * POST /store/mayoristas/me/listas-precio   → crear lista
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { getPool } from "../../../../../lib/db-seq"

function verifyMayorista(req: MedusaRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const p = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as any
    if (!p.mayorista_id || p.rol === "vendedor") return null
    return p.mayorista_id
  } catch { return null }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT lp.*,
       (SELECT COUNT(*) FROM lista_precio_item lpi WHERE lpi.lista_id = lp.id) AS cantidad_items,
       (SELECT COUNT(*) FROM solicitud s WHERE s.lista_precio_id = lp.id) AS cantidad_contactos
     FROM lista_precio lp
     WHERE lp.mayorista_id = $1
     ORDER BY lp.nombre ASC`,
    [mayorista_id]
  )
  return res.json({ listas: rows.map(r => ({
    ...r,
    descuento_porcentaje: parseFloat(r.descuento_porcentaje),
    cantidad_items: parseInt(r.cantidad_items),
    cantidad_contactos: parseInt(r.cantidad_contactos),
  })) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { nombre, descuento_porcentaje = 0 } = req.body as any
  if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es requerido" })

  const pool = getPool()
  const { rows } = await pool.query(
    `INSERT INTO lista_precio (mayorista_id, nombre, descuento_porcentaje)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [mayorista_id, nombre.trim(), descuento_porcentaje]
  )
  return res.status(201).json({ lista: { ...rows[0], descuento_porcentaje: parseFloat(rows[0].descuento_porcentaje) } })
}
