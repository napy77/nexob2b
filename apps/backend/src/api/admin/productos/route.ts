import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_MAESTRO_MODULE } from "../../../modules/producto-maestro"
import { getPool } from "../../../lib/db-seq"

// GET /admin/productos?estado=pendiente&q=azucar
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { estado, q, pasillo_id } = req.query as Record<string, string>

  const conditions: string[] = ["p.deleted_at IS NULL"]
  const params: any[] = []
  let i = 1

  if (estado) { conditions.push(`p.estado = $${i++}`); params.push(estado) }
  if (pasillo_id) { conditions.push(`p.pasillo_id = $${i++}`); params.push(pasillo_id) }
  if (q) {
    conditions.push(`(p.nombre ILIKE $${i} OR p.ean ILIKE $${i} OR p.marca ILIKE $${i})`)
    params.push(`%${q}%`); i++
  }

  const where = conditions.join(" AND ")

  const { rows } = await pool.query(`
    SELECT
      p.*,
      pa.nombre AS pasillo_nombre,
      ru.nombre AS rubro_nombre,
      sr.nombre AS subrubro_nombre,
      (
        SELECT COUNT(*)::int FROM producto_maestro_presentacion pp
        WHERE pp.producto_id = p.id AND pp.deleted_at IS NULL
      ) AS total_presentaciones,
      (
        SELECT COUNT(*)::int FROM producto_mayorista_listing pml
        WHERE pml.producto_id = p.id AND pml.deleted_at IS NULL AND pml.activo = true
      ) AS total_mayoristas
    FROM producto_maestro p
    LEFT JOIN pasillo pa ON pa.id = p.pasillo_id
    LEFT JOIN rubro ru ON ru.id = p.rubro_id
    LEFT JOIN subrubro sr ON sr.id = p.subrubro_id
    WHERE ${where}
    ORDER BY p.nombre ASC
  `, params)

  res.json({ productos: rows })
}

// POST /admin/productos
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const body = req.body as any
  const pool = getPool()

  // Generar EAN interno si no viene uno
  let ean = body.ean?.trim() || null
  if (!ean) {
    const { rows } = await pool.query(`SELECT nextval('nexob2b_ean_seq') AS seq`)
    ean = `NXB-${rows[0].seq}`
  }

  const producto = await svc.createProductos({
    ean,
    nombre: body.nombre,
    descripcion: body.descripcion || null,
    marca: body.marca || null,
    unidad_base: body.unidad_base || "unidad",
    alicuota_iva: parseFloat(String(body.alicuota_iva ?? 21)),
    pasillo_id: body.pasillo_id || null,
    rubro_id: body.rubro_id || null,
    subrubro_id: body.subrubro_id || null,
    estado: "aprobado",
  })

  // Crear presentaciones si vienen en el body
  const presentaciones: any[] = []
  if (body.presentaciones?.length) {
    for (const p of body.presentaciones) {
      const pp = await svc.createProductoPresentacions({
        producto_id: producto.id,
        nombre: p.nombre,
        factor: parseFloat(String(p.factor)) || 1,
        unidades_nivel_anterior: p.unidades_nivel_anterior ? parseFloat(String(p.unidades_nivel_anterior)) : null,
        ean_propio: p.ean_propio || null,
        peso_g: p.peso_g ? parseFloat(String(p.peso_g)) : null,
        largo_mm: p.largo_mm ? parseFloat(String(p.largo_mm)) : null,
        ancho_mm: p.ancho_mm ? parseFloat(String(p.ancho_mm)) : null,
        alto_mm: p.alto_mm ? parseFloat(String(p.alto_mm)) : null,
        orden: p.orden ?? 0,
      })
      presentaciones.push(pp)
    }
  }

  res.status(201).json({ producto: { ...producto, presentaciones } })
}
