import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyApiKey } from "../../../../lib/api-key"
import { getPool } from "../../../../lib/db-seq"

// POST /api/v1/mayorista/sync
// Sync masivo de stock y/o precio desde el ERP/sistema del mayorista.
// Body: { items: [{ ean: "779...", precio?: 100.50, stock?: 200 }] }
// Busca por EAN del producto maestro o EAN propio de la presentación.
// Solo actualiza presentaciones del propio mayorista (validado por API key).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = await verifyApiKey(req as any, "mayorista")
  if (!apiKey) return res.status(401).json({ error: "API key inválida o inactiva" })

  const { items } = req.body as { items: { ean: string; precio?: number; stock?: number }[] }
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items requerido: [{ ean, precio?, stock? }]" })

  const pool = getPool()
  const mayorista_id = apiKey.entidad_id
  let actualizados = 0
  let no_encontrados = 0
  const errores: string[] = []

  for (const item of items) {
    if (!item.ean) { errores.push("Item sin EAN ignorado"); continue }
    if (item.precio == null && item.stock == null) { errores.push(`EAN ${item.ean}: sin precio ni stock`); continue }

    // Buscar presentaciones del mayorista que coincidan con el EAN
    const { rows } = await pool.query(`
      SELECT pmp.id
      FROM producto_mayorista_presentacion pmp
      JOIN producto_mayorista_listing pml ON pml.id = pmp.listing_id
      JOIN producto_maestro_presentacion pp ON pp.id = pmp.presentacion_id
      JOIN producto_maestro p ON p.id = pml.producto_id
      WHERE pml.mayorista_id = $1
        AND (p.ean = $2 OR pp.ean_propio = $2)
        AND pmp.deleted_at IS NULL AND pmp.activo = true
        AND pml.deleted_at IS NULL AND pml.activo = true
    `, [mayorista_id, item.ean])

    if (rows.length === 0) { no_encontrados++; continue }

    // Construir SET dinámico solo con los campos enviados
    const sets: string[] = ["updated_at = now()"]
    const vals: any[] = []
    let idx = 1
    if (item.precio != null) { sets.push(`precio = $${idx++}`); vals.push(item.precio) }
    if (item.stock != null)  { sets.push(`stock = $${idx++}`);  vals.push(item.stock) }

    for (const row of rows) {
      await pool.query(
        `UPDATE producto_mayorista_presentacion SET ${sets.join(", ")} WHERE id = $${idx}`,
        [...vals, row.id]
      )
      actualizados++
    }
  }

  res.json({
    ok: true,
    actualizados,
    no_encontrados,
    errores: errores.length > 0 ? errores : undefined,
  })
}
