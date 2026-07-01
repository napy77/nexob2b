/**
 * GET  /store/mayoristas/me/codigos-descuento  → listar códigos
 * POST /store/mayoristas/me/codigos-descuento  → crear código
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
    `SELECT * FROM codigo_descuento WHERE mayorista_id = $1 ORDER BY created_at DESC`,
    [mayorista_id]
  )

  return res.json({
    codigos: rows.map((r) => ({
      ...r,
      valor: parseFloat(r.valor),
      uso_maximo: r.uso_maximo,
      usos_actuales: r.usos_actuales,
    }))
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { codigo, tipo, valor, uso_maximo, fecha_vencimiento } = req.body as any

  if (!codigo || !tipo || valor == null) {
    return res.status(400).json({ error: "codigo, tipo y valor son requeridos" })
  }
  if (!["porcentaje", "fijo"].includes(tipo)) {
    return res.status(400).json({ error: "tipo debe ser 'porcentaje' o 'fijo'" })
  }

  const pool = getPool()

  // Verificar unicidad dentro del mayorista
  const { rows: existente } = await pool.query(
    `SELECT id FROM codigo_descuento WHERE mayorista_id = $1 AND UPPER(codigo) = UPPER($2)`,
    [mayorista_id, codigo]
  )
  if (existente[0]) return res.status(409).json({ error: "Ya existe un código con ese nombre" })

  const { rows } = await pool.query(
    `INSERT INTO codigo_descuento (mayorista_id, codigo, tipo, valor, uso_maximo, fecha_vencimiento)
     VALUES ($1, UPPER($2), $3, $4, $5, $6)
     RETURNING *`,
    [mayorista_id, codigo, tipo, valor, uso_maximo || null, fecha_vencimiento || null]
  )

  return res.status(201).json({ codigo: { ...rows[0], valor: parseFloat(rows[0].valor) } })
}
