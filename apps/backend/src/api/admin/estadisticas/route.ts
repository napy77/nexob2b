/**
 * GET /admin/estadisticas?mes=YYYY-MM&mayorista_id=xxx
 * Estadísticas globales o por mayorista para el panel admin.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPool } from "../../../lib/db-seq"

async function getStats(pool: any, mayorista_id: string | null, desde: Date, hasta: Date) {
  const baseParams: any[] = [desde.toISOString(), hasta.toISOString()]
  const whereExtra = mayorista_id ? `AND o.mayorista_id = $3` : ""
  if (mayorista_id) baseParams.push(mayorista_id)

  const { rows: [resumen] } = await pool.query(`
    SELECT
      COUNT(*) AS cantidad_ordenes,
      COALESCE(SUM(total), 0) AS total_ventas,
      COALESCE(AVG(total), 0) AS ticket_promedio
    FROM orden o
    WHERE o.estado NOT IN ('cancelado')
      AND o.created_at >= $1
      AND o.created_at < $2
      ${whereExtra}
  `, baseParams)

  const { rows: productos_top } = await pool.query(`
    SELECT
      oi.nombre, oi.sku,
      SUM(oi.cantidad) AS total_cantidad,
      SUM(oi.subtotal) AS total_monto
    FROM orden_item oi
    JOIN orden o ON o.id = oi.orden_id
    WHERE o.estado NOT IN ('cancelado')
      AND o.created_at >= $1
      AND o.created_at < $2
      ${whereExtra}
    GROUP BY oi.nombre, oi.sku
    ORDER BY total_monto DESC LIMIT 10
  `, baseParams)

  const { rows: comercios_top } = await pool.query(`
    SELECT
      o.comercio_id, MAX(c.nombre) AS nombre,
      COUNT(o.id) AS cantidad_ordenes,
      SUM(o.total) AS total_monto
    FROM orden o
    LEFT JOIN comercio c ON c.id = o.comercio_id
    WHERE o.estado NOT IN ('cancelado')
      AND o.created_at >= $1
      AND o.created_at < $2
      ${whereExtra}
    GROUP BY o.comercio_id
    ORDER BY total_monto DESC LIMIT 10
  `, baseParams)

  const { rows: mayoristas_top } = mayorista_id ? { rows: [] } : await pool.query(`
    SELECT
      o.mayorista_id, MAX(m.nombre) AS nombre,
      COUNT(o.id) AS cantidad_ordenes,
      SUM(o.total) AS total_monto
    FROM orden o
    LEFT JOIN mayorista m ON m.id = o.mayorista_id
    WHERE o.estado NOT IN ('cancelado')
      AND o.created_at >= $1
      AND o.created_at < $2
    GROUP BY o.mayorista_id
    ORDER BY total_monto DESC LIMIT 10
  `, baseParams)

  const { rows: vendedores } = await pool.query(`
    SELECT
      o.vendedor_id, MAX(v.nombre) AS nombre,
      COUNT(o.id) AS cantidad_ordenes,
      SUM(o.total) AS total_monto
    FROM orden o
    LEFT JOIN vendedor v ON v.id = o.vendedor_id
    WHERE o.estado NOT IN ('cancelado')
      AND o.created_at >= $1
      AND o.created_at < $2
      AND o.vendedor_id IS NOT NULL
      ${whereExtra}
    GROUP BY o.vendedor_id
    ORDER BY total_monto DESC
  `, baseParams)

  const { rows: por_estado } = await pool.query(`
    SELECT estado, COUNT(*) AS cantidad
    FROM orden o
    WHERE o.created_at >= $1 AND o.created_at < $2 ${whereExtra}
    GROUP BY estado
  `, baseParams)

  return {
    cantidad_ordenes: Number(resumen.cantidad_ordenes),
    total_ventas: Number(resumen.total_ventas),
    ticket_promedio: Number(resumen.ticket_promedio),
    productos_top: productos_top.map((p: any) => ({ ...p, total_cantidad: Number(p.total_cantidad), total_monto: Number(p.total_monto) })),
    comercios_top: comercios_top.map((c: any) => ({ ...c, cantidad_ordenes: Number(c.cantidad_ordenes), total_monto: Number(c.total_monto) })),
    mayoristas_top: mayoristas_top.map((m: any) => ({ ...m, cantidad_ordenes: Number(m.cantidad_ordenes), total_monto: Number(m.total_monto) })),
    vendedores: vendedores.map((v: any) => ({ ...v, cantidad_ordenes: Number(v.cantidad_ordenes), total_monto: Number(v.total_monto) })),
    por_estado: Object.fromEntries(por_estado.map((e: any) => [e.estado, Number(e.cantidad)])),
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mesParam = (req.query.mes as string) || new Date().toISOString().slice(0, 7)
  const mayorista_id = (req.query.mayorista_id as string) || null
  const [year, month] = mesParam.split("-").map(Number)

  const desde = new Date(year, month - 1, 1)
  const hasta = new Date(year, month, 1)
  const desdeAnt = new Date(year, month - 2, 1)
  const hastaAnt = new Date(year, month - 1, 1)

  const pool = getPool()
  const [actual, anterior] = await Promise.all([
    getStats(pool, mayorista_id, desde, hasta),
    getStats(pool, mayorista_id, desdeAnt, hastaAnt),
  ])

  const variacion = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100)

  return res.json({
    mes: mesParam,
    actual,
    anterior,
    variacion: {
      total_ventas: variacion(actual.total_ventas, anterior.total_ventas),
      cantidad_ordenes: variacion(actual.cantidad_ordenes, anterior.cantidad_ordenes),
      ticket_promedio: variacion(actual.ticket_promedio, anterior.ticket_promedio),
    },
  })
}
