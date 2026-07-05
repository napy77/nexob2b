import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyApiKey } from "../../../../lib/api-key"
import { dispararWebhookMayorista } from "../../../../lib/api-key"
import { getPool, nextOrdenNumero } from "../../../../lib/db-seq"
import { ORDEN_MODULE } from "../../../../modules/orden"

// GET /api/v1/pos/ordenes — listado de órdenes del comercio
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = await verifyApiKey(req as any, "nexopos")
  if (!apiKey) return res.status(401).json({ error: "API key inválida o inactiva" })

  const pool = getPool()
  const { rows } = await pool.query(`
    SELECT o.id, o.numero, o.estado, o.total, o.created_at,
           m.nombre AS mayorista_nombre,
           json_agg(json_build_object(
             'nombre', oi.nombre, 'cantidad', oi.cantidad,
             'precio_unitario', oi.precio_unitario, 'subtotal', oi.subtotal
           )) AS items
    FROM orden o
    JOIN mayorista m ON m.id = o.mayorista_id
    JOIN orden_item oi ON oi.orden_id = o.id
    WHERE o.comercio_id = $1 AND o.deleted_at IS NULL
    GROUP BY o.id, m.nombre
    ORDER BY o.created_at DESC
    LIMIT 100
  `, [apiKey.entidad_id])

  res.json({ ordenes: rows })
}

// POST /api/v1/pos/ordenes — crear orden desde POS
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiKey = await verifyApiKey(req as any, "nexopos")
  if (!apiKey) return res.status(401).json({ error: "API key inválida o inactiva" })

  const pool = getPool()
  const comercio_id = apiKey.entidad_id
  const { mayorista_id, items, notas, medio_pago_id } = req.body as any

  if (!mayorista_id || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "mayorista_id e items son requeridos" })

  // Resolver items que vienen con presentacion_id
  const itemsResueltos: any[] = []
  for (const item of items) {
    if (item.presentacion_id) {
      const { rows: [row] } = await pool.query(`
        SELECT pp.nombre AS pres_nombre, pp.factor, p.nombre AS prod_nombre,
               p.ean, p.unidad_base, p.alicuota_iva, pmp.precio
        FROM producto_mayorista_presentacion pmp
        JOIN producto_maestro_presentacion pp ON pp.id = pmp.presentacion_id
        JOIN producto_mayorista_listing pml ON pml.id = pmp.listing_id
        JOIN producto_maestro p ON p.id = pml.producto_id
        WHERE pmp.id = $1 AND pmp.deleted_at IS NULL AND pmp.activo = true
      `, [item.presentacion_id])
      if (!row) return res.status(400).json({ error: `Presentacion ${item.presentacion_id} no encontrada` })
      const neto = row.precio * item.cantidad
      const iva = neto * (row.alicuota_iva / 100)
      itemsResueltos.push({
        presentacion_id: item.presentacion_id,
        nombre: `${row.prod_nombre} — ${row.pres_nombre}`,
        sku: null, ean: row.ean || null,
        precio_unitario: row.precio,
        alicuota_iva: parseFloat(row.alicuota_iva),
        cantidad: item.cantidad,
        unidad: row.pres_nombre,
        subtotal_neto: neto, subtotal_iva: iva, subtotal: neto + iva,
      })
    } else {
      // Item legacy con precio explícito
      const neto = (item.precio_unitario || 0) * item.cantidad
      const iva = neto * ((item.alicuota_iva || 21) / 100)
      itemsResueltos.push({
        ...item,
        subtotal_neto: neto, subtotal_iva: iva, subtotal: neto + iva,
      })
    }
  }

  const total = itemsResueltos.reduce((s, i) => s + i.subtotal, 0)
  const numero = await nextOrdenNumero()

  const ordenService = req.scope.resolve(ORDEN_MODULE)
  const orden = await ordenService.createOrdenes({
    numero, comercio_id, mayorista_id, total,
    estado: "pendiente", notas: notas || null,
    medio_pago_id: medio_pago_id || null,
    costo_medio_pago: 0,
    origen: "nexopos",
  })

  for (const it of itemsResueltos) {
    await ordenService.createOrdenItems({ orden_id: orden.id, ...it })
  }

  // Disparar webhook del mayorista (async, best-effort)
  dispararWebhookMayorista(mayorista_id, "orden.nueva", {
    orden_id: orden.id, numero, total, comercio_id, items: itemsResueltos.length,
  })

  res.status(201).json({ orden: { id: orden.id, numero, estado: "pendiente", total } })
}
