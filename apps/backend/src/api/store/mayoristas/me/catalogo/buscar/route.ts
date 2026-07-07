import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPool } from "../../../../../../lib/db-seq"

// GET /store/mayoristas/me/catalogo/buscar?ean=7790123456789
// Busca en el catálogo maestro por EAN o nombre — para que el mayorista vincule un producto
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { ean, q, page, pageSize } = req.query as Record<string, string>

  if (!ean && !q) return res.status(400).json({ error: "Enviá ?ean= o ?q= para buscar" })

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize as string, 10) || 20))
  const offset = (pageNum - 1) * pageSizeNum

  let where = "p.deleted_at IS NULL AND p.estado != 'rechazado'"
  const params: any[] = []

  if (ean) {
    where += ` AND (p.ean = $${params.length + 1} OR pp.ean_propio = $${params.length + 1})`
    params.push(ean.trim())
  } else if (q) {
    where += ` AND (p.nombre ILIKE $${params.length + 1} OR p.marca ILIKE $${params.length + 1} OR p.ean ILIKE $${params.length + 1})`
    params.push(`%${q}%`)
  }

  // DISTINCT ON (p.id) obliga a que el primer ORDER BY sea p.id (requisito de Postgres),
  // así que el orden alfabético real se aplica afuera, en la query externa — si no, el
  // LIMIT/OFFSET trunca en orden de id y los resultados de búsqueda salen "desordenados".
  const { rows } = await pool.query(`
    SELECT *, COUNT(*) OVER() AS total_count
    FROM (
      SELECT DISTINCT ON (p.id)
        p.*,
        pa.nombre AS pasillo_nombre,
        ru.nombre AS rubro_nombre,
        sr.nombre AS subrubro_nombre,
        (
          SELECT json_agg(pp2.* ORDER BY pp2.orden ASC)
          FROM producto_maestro_presentacion pp2
          WHERE pp2.producto_id = p.id AND pp2.deleted_at IS NULL
        ) AS presentaciones
      FROM producto_maestro p
      LEFT JOIN producto_maestro_presentacion pp ON pp.producto_id = p.id AND pp.deleted_at IS NULL
      LEFT JOIN pasillo pa ON pa.id = p.pasillo_id
      LEFT JOIN rubro ru ON ru.id = p.rubro_id
      LEFT JOIN subrubro sr ON sr.id = p.subrubro_id
      WHERE ${where}
      ORDER BY p.id
    ) dedup
    ORDER BY nombre ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, pageSizeNum, offset])

  const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0
  const productos = rows.map(({ total_count, ...r }) => r)

  res.json({
    productos,
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(total / pageSizeNum),
  })
}
