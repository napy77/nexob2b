/**
 * GET    /store/mayoristas/me/listas-precio/:listaId  → detalle + items
 * PUT    /store/mayoristas/me/listas-precio/:listaId  → actualizar nombre/descuento
 * DELETE /store/mayoristas/me/listas-precio/:listaId  → eliminar
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

async function getLista(pool: any, listaId: string, mayorista_id: string) {
  const { rows } = await pool.query(
    `SELECT * FROM lista_precio WHERE id = $1 AND mayorista_id = $2`,
    [listaId, mayorista_id]
  )
  return rows[0] || null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { listaId } = req.params
  const pool = getPool()
  const lista = await getLista(pool, listaId, mayorista_id)
  if (!lista) return res.status(404).json({ error: "Lista no encontrada" })

  const { rows: items } = await pool.query(
    `SELECT lpi.*, p.nombre AS producto_nombre, p.sku, p.precio AS precio_base, p.unidad
     FROM lista_precio_item lpi
     JOIN producto p ON p.id = lpi.producto_id
     WHERE lpi.lista_id = $1
     ORDER BY p.nombre ASC`,
    [listaId]
  )

  return res.json({
    lista: { ...lista, descuento_porcentaje: parseFloat(lista.descuento_porcentaje) },
    items: items.map((i: any) => ({
      ...i,
      precio_fijo: parseFloat(i.precio_fijo),
      precio_base: i.precio_base != null ? parseFloat(i.precio_base) : null,
    })),
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { listaId } = req.params
  const { nombre, descuento_porcentaje } = req.body as any
  const pool = getPool()

  const lista = await getLista(pool, listaId, mayorista_id)
  if (!lista) return res.status(404).json({ error: "Lista no encontrada" })

  const newNombre = nombre?.trim() ?? lista.nombre
  const newDesc = descuento_porcentaje ?? lista.descuento_porcentaje

  const { rows } = await pool.query(
    `UPDATE lista_precio SET nombre = $1, descuento_porcentaje = $2, updated_at = now()
     WHERE id = $3 RETURNING *`,
    [newNombre, newDesc, listaId]
  )
  return res.json({ lista: { ...rows[0], descuento_porcentaje: parseFloat(rows[0].descuento_porcentaje) } })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const mayorista_id = verifyMayorista(req)
  if (!mayorista_id) return res.status(401).json({ error: "No autorizado" })

  const { listaId } = req.params
  const pool = getPool()

  const lista = await getLista(pool, listaId, mayorista_id)
  if (!lista) return res.status(404).json({ error: "Lista no encontrada" })

  // Desasignar de contactos antes de borrar
  await pool.query(`UPDATE solicitud SET lista_precio_id = NULL WHERE lista_precio_id = $1`, [listaId])
  await pool.query(`DELETE FROM lista_precio WHERE id = $1`, [listaId])

  return res.json({ ok: true })
}
