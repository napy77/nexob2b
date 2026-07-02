import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPool } from "../../../lib/db"

// GET /store/productos?q=azucar&pasillo_id=xx&comercio_id=xx
// Catálogo unificado: un producto → múltiples mayoristas con sus presentaciones
// Si viene comercio_id, filtra por mayoristas de la zona del comercio y muestra estado de alta
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { q, pasillo_id, rubro_id, subrubro_id, comercio_id, mayorista_id } = req.query as Record<string, string>

  const conditions: string[] = [
    "p.deleted_at IS NULL",
    "p.estado = 'aprobado'",
    "pml.deleted_at IS NULL",
    "pml.activo = true",
    "pml.aprobado = true",
    "pmp.deleted_at IS NULL",
    "pmp.activo = true",
  ]
  const params: any[] = []
  let i = 1

  if (q) {
    conditions.push(`(p.nombre ILIKE $${i} OR p.ean ILIKE $${i} OR p.marca ILIKE $${i})`)
    params.push(`%${q}%`); i++
  }
  if (pasillo_id) { conditions.push(`p.pasillo_id = $${i++}`); params.push(pasillo_id) }
  if (rubro_id) { conditions.push(`p.rubro_id = $${i++}`); params.push(rubro_id) }
  if (subrubro_id) { conditions.push(`p.subrubro_id = $${i++}`); params.push(subrubro_id) }
  if (mayorista_id) { conditions.push(`pml.mayorista_id = $${i++}`); params.push(mayorista_id) }

  // Filtro por zona del comercio
  if (comercio_id) {
    conditions.push(`(
      m.zonas IS NULL OR m.zonas = '[]'::jsonb OR
      EXISTS (
        SELECT 1 FROM comercio c
        WHERE c.id = $${i} AND (
          m.zonas @> to_jsonb(c.provincia) OR
          m.zonas @> to_jsonb(c.ciudad)
        )
      )
    )`)
    params.push(comercio_id); i++
  }

  const where = conditions.join(" AND ")

  const { rows } = await pool.query(`
    SELECT
      p.id,
      p.ean,
      p.nombre,
      p.descripcion,
      p.marca,
      p.unidad_base,
      p.alicuota_iva,
      p.pasillo_id,
      p.rubro_id,
      p.subrubro_id,
      pa.nombre AS pasillo_nombre,
      ru.nombre AS rubro_nombre,
      sr.nombre AS subrubro_nombre,
      json_agg(
        json_build_object(
          'listing_id', pml.id,
          'mayorista_id', pml.mayorista_id,
          'mayorista_nombre', m.nombre,
          'mayorista_logo', m.logo_url,
          'tiempo_entrega_dias', pml.tiempo_entrega_dias,
          'descripcion_propia', pml.descripcion_propia,
          'tiene_alta', CASE
            WHEN $${i}::text IS NOT NULL THEN EXISTS(
              SELECT 1 FROM contacto_mayorista cm
              WHERE cm.mayorista_id = pml.mayorista_id AND cm.comercio_id = $${i}::text AND cm.deleted_at IS NULL
            )
            ELSE NULL
          END,
          'presentaciones', (
            SELECT json_agg(
              json_build_object(
                'id', pmp2.id,
                'presentacion_id', pmp2.presentacion_id,
                'nombre', pp.nombre,
                'factor', pp.factor,
                'ean_propio', pp.ean_propio,
                'peso_g', pp.peso_g,
                'largo_mm', pp.largo_mm,
                'ancho_mm', pp.ancho_mm,
                'alto_mm', pp.alto_mm,
                'orden', pp.orden,
                'precio', pmp2.precio,
                'precio_lista', pmp2.precio_lista,
                'stock', pmp2.stock
              ) ORDER BY pp.orden ASC
            )
            FROM producto_mayorista_presentacion pmp2
            JOIN producto_maestro_presentacion pp ON pp.id = pmp2.presentacion_id AND pp.deleted_at IS NULL
            WHERE pmp2.listing_id = pml.id AND pmp2.deleted_at IS NULL AND pmp2.activo = true
          )
        ) ORDER BY m.nombre ASC
      ) AS mayoristas
    FROM producto_maestro p
    JOIN producto_mayorista_listing pml ON pml.producto_id = p.id
    JOIN producto_mayorista_presentacion pmp ON pmp.listing_id = pml.id
    JOIN mayorista m ON m.id = pml.mayorista_id AND m.deleted_at IS NULL
    LEFT JOIN pasillo pa ON pa.id = p.pasillo_id
    LEFT JOIN rubro ru ON ru.id = p.rubro_id
    LEFT JOIN subrubro sr ON sr.id = p.subrubro_id
    WHERE ${where}
    GROUP BY p.id, pa.nombre, ru.nombre, sr.nombre
    ORDER BY p.nombre ASC
    LIMIT 100
  `, [...params, comercio_id || null])

  res.json({ productos: rows })
}
