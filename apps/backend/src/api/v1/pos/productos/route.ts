import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { getPool } from "../../../../lib/db-seq"

function getComercioId(req: MedusaRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const decoded: any = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    return decoded.comercio_id || null
  } catch { return null }
}

// GET /api/v1/pos/productos?q=&pasillo_id=&rubro_id=&subrubro_id=
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const comercio_id = getComercioId(req)
  if (!comercio_id) return res.status(401).json({ error: "Token inválido o expirado" })

  const pool = getPool()
  const { q, pasillo_id, rubro_id, subrubro_id, page, pageSize } = req.query as Record<string, string>

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const pageSizeNum = Math.min(200, Math.max(1, parseInt(pageSize as string, 10) || 50))
  const offset = (pageNum - 1) * pageSizeNum

  const conditions: string[] = [
    "p.deleted_at IS NULL", "p.estado = 'aprobado'",
    "pml.deleted_at IS NULL", "pml.activo = true", "pml.aprobado = true",
    `EXISTS (SELECT 1 FROM producto_mayorista_presentacion pmp WHERE pmp.listing_id = pml.id AND pmp.deleted_at IS NULL AND pmp.activo = true)`,
    `(m.zonas IS NULL OR m.zonas = '[]'::jsonb OR EXISTS (
      SELECT 1 FROM comercio c WHERE c.id = $1 AND (m.zonas @> to_jsonb(c.provincia) OR m.zonas @> to_jsonb(c.ciudad))
    ))`,
  ]
  const params: any[] = [comercio_id]
  let i = 2

  if (q) { conditions.push(`(p.nombre ILIKE $${i} OR p.ean ILIKE $${i} OR p.marca ILIKE $${i})`); params.push(`%${q}%`); i++ }
  if (pasillo_id) { conditions.push(`p.pasillo_id = $${i++}`); params.push(pasillo_id) }
  if (rubro_id) { conditions.push(`p.rubro_id = $${i++}`); params.push(rubro_id) }
  if (subrubro_id) { conditions.push(`p.subrubro_id = $${i++}`); params.push(subrubro_id) }

  const { rows } = await pool.query(`
    SELECT
      p.id, p.ean, p.nombre, p.marca, p.unidad_base, p.alicuota_iva, p.imagen_url,
      pa.nombre AS pasillo, ru.nombre AS rubro, sr.nombre AS subrubro,
      COUNT(*) OVER() AS total_count,
      json_agg(json_build_object(
        'mayorista_id', pml.mayorista_id,
        'mayorista_nombre', m.nombre,
        'tiene_alta', EXISTS(SELECT 1 FROM solicitud s WHERE s.mayorista_id = pml.mayorista_id AND s.comercio_id = $1 AND s.estado = 'aceptado' AND s.deleted_at IS NULL),
        'presentaciones', (
          SELECT json_agg(json_build_object(
            'id', pmp.id,
            'nombre', pp.nombre,
            'factor', pp.factor,
            'precio', pmp.precio,
            'stock', pmp.stock,
            'ean_propio', pp.ean_propio
          )) FROM producto_mayorista_presentacion pmp
          JOIN producto_maestro_presentacion pp ON pp.id = pmp.presentacion_id
          WHERE pmp.listing_id = pml.id AND pmp.deleted_at IS NULL AND pmp.activo = true
        )
      ) ORDER BY m.nombre) AS mayoristas
    FROM producto_maestro p
    JOIN producto_mayorista_listing pml ON pml.producto_id = p.id
    JOIN mayorista m ON m.id = pml.mayorista_id
    LEFT JOIN pasillo pa ON pa.id = p.pasillo_id
    LEFT JOIN rubro ru ON ru.id = p.rubro_id
    LEFT JOIN subrubro sr ON sr.id = p.subrubro_id
    WHERE ${conditions.join(" AND ")}
    GROUP BY p.id, pa.nombre, ru.nombre, sr.nombre
    ORDER BY p.nombre
    LIMIT $${i} OFFSET $${i + 1}
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
