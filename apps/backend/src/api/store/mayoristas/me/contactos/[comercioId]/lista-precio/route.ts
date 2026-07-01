/**
 * PUT /store/mayoristas/me/contactos/:comercioId/lista-precio
 * Asigna (o desasigna) una lista de precios a un contacto.
 * Body: { lista_precio_id: string | null }
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

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { comercioId } = req.params
  const { lista_precio_id } = req.body as any   // null para desasignar
  const pool = getPool()

  // Validar que la lista (si se provee) pertenece a este mayorista
  if (lista_precio_id) {
    const { rows } = await pool.query(
      `SELECT id FROM lista_precio WHERE id = $1 AND mayorista_id = $2`,
      [lista_precio_id, mayorista_id]
    )
    if (!rows[0]) return res.status(404).json({ error: "Lista no encontrada" })
  }

  const { rows } = await pool.query(
    `UPDATE solicitud
     SET lista_precio_id = $1
     WHERE comercio_id = $2 AND mayorista_id = $3
     RETURNING id, lista_precio_id`,
    [lista_precio_id || null, comercioId, mayorista_id]
  )

  if (!rows[0]) return res.status(404).json({ error: "Contacto no encontrado" })

  return res.json({ ok: true, lista_precio_id: rows[0].lista_precio_id })
}
