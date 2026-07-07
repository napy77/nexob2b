import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_LISTING_MODULE } from "../../../../../modules/producto-listing"
import { PRODUCTO_MAESTRO_MODULE } from "../../../../../modules/producto-maestro"
import { getPool } from "../../../../../lib/db-seq"

const getMayoristaId = async (req: MedusaRequest): Promise<string | null> => {
  const pool = getPool()
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null
  const jwt = require("jsonwebtoken")
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    const { rows } = await pool.query(
      `SELECT id FROM mayorista WHERE actor_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [decoded.mayorista_id || decoded.sub]
    )
    // Try by actor_id first, then by direct id
    if (rows.length) return rows[0].id
    const { rows: rows2 } = await pool.query(
      `SELECT id FROM mayorista WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [decoded.mayorista_id]
    )
    return rows2[0]?.id || null
  } catch { return null }
}

// GET /store/mayoristas/me/catalogo — listar mis listings con productos
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()

  // Obtener mayorista del token
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Sin autenticación" })
  const jwt = require("jsonwebtoken")
  let mayorista_id: string
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    mayorista_id = decoded.mayorista_id
    if (!mayorista_id) return res.status(401).json({ error: "Token inválido" })
  } catch { return res.status(401).json({ error: "Token expirado" }) }

  const { q, page, pageSize } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const pageSizeNum = Math.min(200, Math.max(1, parseInt(pageSize as string, 10) || 50))
  const offset = (pageNum - 1) * pageSizeNum

  const params: any[] = [mayorista_id]
  let extra = ""
  if (q) { extra = ` AND (p.nombre ILIKE $2 OR p.ean ILIKE $2 OR p.marca ILIKE $2)`; params.push(`%${q}%`) }

  const { rows } = await pool.query(`
    SELECT
      pml.*,
      p.ean, p.nombre, p.descripcion, p.marca, p.unidad_base, p.alicuota_iva, p.estado AS producto_estado,
      p.imagen_url, p.pasillo_id, p.rubro_id, p.subrubro_id,
      pa.nombre AS pasillo_nombre,
      COUNT(*) OVER() AS total_count,
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'mp_id', pmp2.id,
            'presentacion_id', pp2.id,
            'nombre', pp2.nombre,
            'factor', pp2.factor,
            'ean_propio', pp2.ean_propio,
            'peso_g', pp2.peso_g,
            'orden', pp2.orden,
            'precio', pmp2.precio,
            'precio_lista', pmp2.precio_lista,
            'stock', pmp2.stock,
            'cantidad_minima', COALESCE(pmp2.cantidad_minima, 1),
            'activo', COALESCE(pmp2.activo, false)
          ) ORDER BY pp2.orden ASC
        ), '[]')
        FROM producto_maestro_presentacion pp2
        LEFT JOIN producto_mayorista_presentacion pmp2
          ON pmp2.listing_id = pml.id AND pmp2.presentacion_id = pp2.id AND pmp2.deleted_at IS NULL
        WHERE pp2.producto_id = p.id AND pp2.deleted_at IS NULL
      ) AS presentaciones
    FROM producto_mayorista_listing pml
    JOIN producto_maestro p ON p.id = pml.producto_id
    LEFT JOIN pasillo pa ON pa.id = p.pasillo_id
    WHERE pml.mayorista_id = $1 AND pml.deleted_at IS NULL AND p.deleted_at IS NULL ${extra}
    GROUP BY pml.id, p.id, pa.nombre
    ORDER BY p.nombre ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, pageSizeNum, offset])

  const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0
  const listings = rows.map(({ total_count, ...r }) => r)

  res.json({
    listings,
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(total / pageSizeNum),
  })
}

// POST /store/mayoristas/me/catalogo — vincular producto o proponer nuevo
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const svcMaestro: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const svcListing: any = req.scope.resolve(PRODUCTO_LISTING_MODULE)
  const body = req.body as any

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Sin autenticación" })
  const jwt = require("jsonwebtoken")
  let mayorista_id: string
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    mayorista_id = decoded.mayorista_id
    if (!mayorista_id) return res.status(401).json({ error: "Token inválido" })
  } catch { return res.status(401).json({ error: "Token expirado" }) }

  let producto_id = body.producto_id

  // Si no viene producto_id, crear el producto como "pendiente"
  if (!producto_id) {
    if (!body.nombre) return res.status(400).json({ error: "Se requiere nombre del producto" })

    let ean = body.ean?.trim() || null
    if (!ean) {
      const { rows } = await pool.query(`SELECT nextval('nexob2b_ean_seq') AS seq`)
      ean = `NXB-${rows[0].seq}`
    }

    const nuevo = await svcMaestro.createProductos({
      ean,
      nombre: body.nombre,
      descripcion: body.descripcion || null,
      marca: body.marca || null,
      unidad_base: body.unidad_base || "unidad",
      alicuota_iva: parseFloat(String(body.alicuota_iva ?? 21)),
      pasillo_id: body.pasillo_id || null,
      rubro_id: body.rubro_id || null,
      subrubro_id: body.subrubro_id || null,
      estado: "pendiente",
      creado_por_mayorista_id: mayorista_id,
    })
    producto_id = nuevo.id
  }

  // Verificar que no exista ya un listing para este mayorista + producto
  const { rows: existing } = await pool.query(
    `SELECT id FROM producto_mayorista_listing WHERE producto_id = $1 AND mayorista_id = $2 AND deleted_at IS NULL`,
    [producto_id, mayorista_id]
  )
  if (existing.length) return res.status(409).json({ error: "Ya tenés este producto en tu catálogo", listing_id: existing[0].id })

  // Verificar que el producto esté aprobado (o fue recién creado como pendiente por este mayorista)
  const { rows: [prod] } = await pool.query(`SELECT estado FROM producto_maestro WHERE id = $1`, [producto_id])
  const aprobado = prod?.estado === "aprobado"

  const listing = await svcListing.createProductoMayoristaListings({
    producto_id,
    mayorista_id,
    descripcion_propia: body.descripcion_propia || null,
    notas: body.notas || null,
    tiempo_entrega_dias: body.tiempo_entrega_dias ? parseInt(body.tiempo_entrega_dias) : null,
    activo: true,
    aprobado,
  })

  res.status(201).json({ listing })
}
