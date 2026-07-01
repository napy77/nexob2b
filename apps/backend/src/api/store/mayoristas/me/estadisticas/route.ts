/**
 * GET /store/mayoristas/me/estadisticas?mes=YYYY-MM
 * Devuelve métricas del mes indicado + comparativa con el mes anterior.
 * Solo órdenes con estado != 'cancelado' se cuentan como ventas.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import jwt from "jsonwebtoken"
import { getPool } from "../../../../../lib/db-seq"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(
      auth.split(" ")[1],
      process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
    ) as { mayorista_id: string }
  } catch { return null }
}

async function getStats(pool: any, mayorista_id: string, desde: Date, hasta: Date) {
  const params = [mayorista_id, desde.toISOString(), hasta.toISOString()]

  // Totales generales
  const { rows: [resumen] } = await pool.query(`
    SELECT
      COUNT(*) AS cantidad_ordenes,
      COALESCE(SUM(total), 0) AS total_ventas,
      COALESCE(AVG(total), 0) AS ticket_promedio
    FROM orden
    WHERE mayorista_id = $1
      AND estado NOT IN ('cancelado')
      AND created_at >= $2
      AND created_at < $3
  `, params)

  // Productos más vendidos (top 10)
  const { rows: productos_top } = await pool.query(`
    SELECT
      oi.nombre,
      oi.sku,
      SUM(oi.cantidad) AS total_cantidad,
      SUM(oi.subtotal) AS total_monto
    FROM orden_item oi
    JOIN orden o ON o.id = oi.orden_id
    WHERE o.mayorista_id = $1
      AND o.estado NOT IN ('cancelado')
      AND o.created_at >= $2
      AND o.created_at < $3
    GROUP BY oi.nombre, oi.sku
    ORDER BY total_monto DESC
    LIMIT 10
  `, params)

  // Comercios top (top 10)
  const { rows: comercios_top } = await pool.query(`
    SELECT
      o.comercio_id,
      MAX(c.nombre) AS nombre,
      COUNT(o.id) AS cantidad_ordenes,
      SUM(o.total) AS total_monto
    FROM orden o
    LEFT JOIN comercio c ON c.id = o.comercio_id
    WHERE o.mayorista_id = $1
      AND o.estado NOT IN ('cancelado')
      AND o.created_at >= $2
      AND o.created_at < $3
    GROUP BY o.comercio_id
    ORDER BY total_monto DESC
    LIMIT 10
  `, params)

  // Vendedores (todos los que tuvieron órdenes)
  const { rows: vendedores } = await pool.query(`
    SELECT
      o.vendedor_id,
      MAX(v.nombre) AS nombre,
      COUNT(o.id) AS cantidad_ordenes,
      SUM(o.total) AS total_monto
    FROM orden o
    LEFT JOIN vendedor v ON v.id = o.vendedor_id
    WHERE o.mayorista_id = $1
      AND o.estado NOT IN ('cancelado')
      AND o.created_at >= $2
      AND o.created_at < $3
      AND o.vendedor_id IS NOT NULL
    GROUP BY o.vendedor_id
    ORDER BY total_monto DESC
  `, params)

  // Órdenes por estado (para breakdown)
  const { rows: por_estado } = await pool.query(`
    SELECT estado, COUNT(*) AS cantidad
    FROM orden
    WHERE mayorista_id = $1
      AND created_at >= $2
      AND created_at < $3
    GROUP BY estado
  `, params)

  return {
    cantidad_ordenes: Number(resumen.cantidad_ordenes),
    total_ventas: Number(resumen.total_ventas),
    ticket_promedio: Number(resumen.ticket_promedio),
    productos_top: productos_top.map((p: any) => ({
      nombre: p.nombre,
      sku: p.sku,
      total_cantidad: Number(p.total_cantidad),
      total_monto: Number(p.total_monto),
    })),
    comercios_top: comercios_top.map((c: any) => ({
      comercio_id: c.comercio_id,
      nombre: c.nombre || "Sin nombre",
      cantidad_ordenes: Number(c.cantidad_ordenes),
      total_monto: Number(c.total_monto),
    })),
    vendedores: vendedores.map((v: any) => ({
      vendedor_id: v.vendedor_id,
      nombre: v.nombre || "Sin nombre",
      cantidad_ordenes: Number(v.cantidad_ordenes),
      total_monto: Number(v.total_monto),
    })),
    por_estado: Object.fromEntries(por_estado.map((e: any) => [e.estado, Number(e.cantidad)])),
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  // Parsear mes: YYYY-MM, default = mes actual
  const mesParam = (req.query.mes as string) || new Date().toISOString().slice(0, 7)
  const [year, month] = mesParam.split("-").map(Number)

  const desde = new Date(year, month - 1, 1)
  const hasta = new Date(year, month, 1) // primer día del mes siguiente

  // Mes anterior
  const desdeAnterior = new Date(year, month - 2, 1)
  const hastaAnterior = new Date(year, month - 1, 1)

  const pool = getPool()

  const [actual, anterior] = await Promise.all([
    getStats(pool, payload.mayorista_id, desde, hasta),
    getStats(pool, payload.mayorista_id, desdeAnterior, hastaAnterior),
  ])

  // Calcular variación %
  const variacion = (actual: number, anterior: number) => {
    if (anterior === 0) return actual > 0 ? 100 : 0
    return Math.round(((actual - anterior) / anterior) * 100)
  }

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
