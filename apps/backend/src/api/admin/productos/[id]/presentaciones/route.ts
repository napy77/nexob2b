import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_MAESTRO_MODULE } from "../../../../../modules/producto-maestro"
import { getPool } from "../../../../../lib/db"

// GET /admin/productos/:id/presentaciones
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pool = getPool()
  const { rows } = await pool.query(`
    SELECT * FROM producto_maestro_presentacion
    WHERE producto_id = $1 AND deleted_at IS NULL
    ORDER BY orden ASC, factor ASC
  `, [req.params.id])
  res.json({ presentaciones: rows })
}

// POST /admin/productos/:id/presentaciones
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const body = req.body as any

  const presentacion = await svc.createProductoPresentacions({
    producto_id: req.params.id,
    nombre: body.nombre,
    factor: parseFloat(String(body.factor)) || 1,
    unidades_nivel_anterior: body.unidades_nivel_anterior ? parseFloat(String(body.unidades_nivel_anterior)) : null,
    ean_propio: body.ean_propio || null,
    peso_g: body.peso_g ? parseFloat(String(body.peso_g)) : null,
    largo_mm: body.largo_mm ? parseFloat(String(body.largo_mm)) : null,
    ancho_mm: body.ancho_mm ? parseFloat(String(body.ancho_mm)) : null,
    alto_mm: body.alto_mm ? parseFloat(String(body.alto_mm)) : null,
    orden: body.orden ?? 0,
  })

  res.status(201).json({ presentacion })
}
