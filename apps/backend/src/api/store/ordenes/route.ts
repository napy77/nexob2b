import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../modules/orden"
import { COMERCIO_MODULE } from "../../../modules/comercio"
import { MEDIO_PAGO_MODULE } from "../../../modules/medio_pago"
import { TRANSPORTE_MODULE } from "../../../modules/transporte"
import jwt from "jsonwebtoken"
import { nextOrdenNumero } from "../../../lib/db-seq"
import { notificarNuevaOrden } from "../../../lib/notifications"
import { dispararWebhookMayorista } from "../../../lib/api-key"
import { MAYORISTA_MODULE } from "../../../modules/mayorista"
import { getPool } from "../../../lib/db-seq"

// Resolver item desde presentacion_id
async function resolverItemDesdePresentacion(pool: any, item: any): Promise<any | null> {
  const { rows: [row] } = await pool.query(`
    SELECT
      pp.nombre AS presentacion_nombre,
      pp.factor,
      pp.ean_propio,
      p.nombre AS producto_nombre,
      p.ean AS producto_ean,
      p.unidad_base,
      p.alicuota_iva,
      pmp.precio,
      pmp.listing_id,
      pml.mayorista_id
    FROM producto_mayorista_presentacion pmp
    JOIN producto_maestro_presentacion pp ON pp.id = pmp.presentacion_id
    JOIN producto_mayorista_listing pml ON pml.id = pmp.listing_id
    JOIN producto_maestro p ON p.id = pml.producto_id
    WHERE pmp.id = $1 AND pmp.deleted_at IS NULL AND pmp.activo = true
  `, [item.presentacion_id])
  if (!row) return null
  const neto = row.precio * item.cantidad
  const iva = neto * (row.alicuota_iva / 100)
  return {
    presentacion_id: item.presentacion_id,
    listing_id: row.listing_id,
    nombre: `${row.producto_nombre} — ${row.presentacion_nombre}`,
    sku: null,
    ean: row.ean_propio || row.producto_ean || null,
    precio_unitario: row.precio,
    alicuota_iva: parseFloat(String(row.alicuota_iva)),
    cantidad: item.cantidad,
    unidad: row.presentacion_nombre,
    subtotal_neto: neto,
    subtotal_iva: iva,
    subtotal: neto + iva,
    _mayorista_id: row.mayorista_id,
  }
}

const verifyComercio = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { comercio_id: string }
  } catch { return null }
}

// GET /store/ordenes — listado de pedidos del comercio logueado
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyComercio(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const ordenes = await svc.listOrdens(
    { comercio_id: payload.comercio_id },
    { order: { created_at: "DESC" } }
  )

  // Cargar items de cada orden
  const ordenesConItems = await Promise.all(ordenes.map(async (o: any) => {
    const items = await svc.listOrdenItems({ orden_id: o.id }, { order: { created_at: "ASC" } })
    return { ...o, items }
  }))

  return res.json({ ordenes: ordenesConItems })
}

// POST /store/ordenes — crear nuevo pedido
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyComercio(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)
  const comercio = await comercioSvc.retrieveComercio(payload.comercio_id).catch(() => null)
  if (!comercio || comercio.estado !== "aprobado") {
    return res.status(403).json({ error: "Comercio no aprobado" })
  }

  const body = req.body as any
  const { mayorista_id, items, notas, medio_pago_id, transporte_id, codigo_descuento_id } = body

  if (!mayorista_id || !items?.length) {
    return res.status(400).json({ error: "Faltan mayorista_id o items" })
  }

  // Calcular totales de productos — soporta presentacion_id (nuevo catálogo) y campos directos (legado)
  const pool = getPool()
  let total_neto = 0
  let total_iva = 0
  const itemsCalcRaw = await Promise.all(items.map(async (item: any) => {
    if (item.presentacion_id) {
      const resolved = await resolverItemDesdePresentacion(pool, item)
      if (!resolved) throw new Error(`Presentación ${item.presentacion_id} no encontrada o inactiva`)
      return resolved
    }
    const neto = item.precio_unitario * item.cantidad
    const iva = neto * (item.alicuota_iva / 100)
    return {
      presentacion_id: null,
      listing_id: null,
      producto_id: item.producto_id,
      nombre: item.nombre,
      sku: item.sku || null,
      ean: item.ean || null,
      precio_unitario: item.precio_unitario,
      alicuota_iva: item.alicuota_iva || 21,
      cantidad: item.cantidad,
      unidad: item.unidad,
      subtotal_neto: neto,
      subtotal_iva: iva,
      subtotal: neto + iva,
      _mayorista_id: null,
    }
  }))
  const itemsCalc = itemsCalcRaw
  itemsCalc.forEach((item: any) => {
    total_neto += item.subtotal_neto
    total_iva += item.subtotal_iva
  })
  const subtotal_con_iva = total_neto + total_iva

  // Resolver medio de pago
  let medio_pago_nombre: string | null = null
  let porcentaje_costo_mp = 0
  let costo_medio_pago = 0
  if (medio_pago_id) {
    try {
      const mpSvc: any = req.scope.resolve(MEDIO_PAGO_MODULE)
      const mp = await mpSvc.retrieveMedioPago(medio_pago_id).catch(() => null)
      if (mp) {
        medio_pago_nombre = mp.nombre
        // Buscar si el mayorista tiene su propio porcentaje
        const configMayorista = await mpSvc.listMayoristaMedioPagos({ mayorista_id, medio_pago_id })
        const pctMayorista = configMayorista[0]?.porcentaje_costo
        porcentaje_costo_mp = pctMayorista != null && pctMayorista > 0
          ? parseFloat(String(pctMayorista))
          : parseFloat(String(mp.porcentaje_costo)) || 0
        costo_medio_pago = Math.round(subtotal_con_iva * porcentaje_costo_mp) / 100
      }
    } catch {}
  }

  // Resolver transporte
  let transporte_nombre: string | null = null
  let porcentaje_costo_transporte = 0
  let costo_transporte = 0
  if (transporte_id) {
    try {
      const trSvc: any = req.scope.resolve(TRANSPORTE_MODULE)
      const tr = await trSvc.retrieveTransporte(transporte_id).catch(() => null)
      if (tr) {
        transporte_nombre = tr.nombre
        // Buscar si el mayorista tiene su propio porcentaje
        const configMayorista = await trSvc.listMayoristaTransportes({ mayorista_id, transporte_id })
        const pctMayorista = configMayorista[0]?.porcentaje_costo
        porcentaje_costo_transporte = pctMayorista != null && pctMayorista > 0
          ? parseFloat(String(pctMayorista))
          : parseFloat(String(tr.porcentaje_costo)) || 0
        costo_transporte = Math.round(subtotal_con_iva * porcentaje_costo_transporte) / 100
      }
    } catch {}
  }

  // Resolver código de descuento
  let monto_descuento = 0
  let codigo_id_validado: string | null = null
  if (codigo_descuento_id) {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT * FROM codigo_descuento WHERE id = $1 AND mayorista_id = $2 AND activo = true`,
      [codigo_descuento_id, mayorista_id]
    )
    const cd = rows[0]
    if (cd) {
      const vencido = cd.fecha_vencimiento && new Date(cd.fecha_vencimiento) < new Date()
      const agotado = cd.uso_maximo !== null && cd.usos_actuales >= cd.uso_maximo
      if (!vencido && !agotado) {
        const valor = parseFloat(cd.valor)
        const base = subtotal_con_iva + costo_medio_pago + costo_transporte
        monto_descuento = cd.tipo === "porcentaje"
          ? Math.round(base * valor / 100 * 100) / 100
          : Math.min(valor, base)
        codigo_id_validado = cd.id
        // Incrementar usos atómicamente
        await pool.query(
          `UPDATE codigo_descuento SET usos_actuales = usos_actuales + 1 WHERE id = $1`,
          [cd.id]
        )
      }
    }
  }

  const total = subtotal_con_iva + costo_medio_pago + costo_transporte - monto_descuento

  const svc: any = req.scope.resolve(ORDEN_MODULE)

  const numero = await nextOrdenNumero()
  const orden = await svc.createOrdens({
    numero,
    comercio_id: payload.comercio_id,
    mayorista_id,
    estado: "cargada",
    notas: notas || null,
    total_neto,
    total_iva,
    total,
    medio_pago_id: medio_pago_id || null,
    medio_pago_nombre,
    porcentaje_costo_mp,
    costo_medio_pago,
    transporte_id: transporte_id || null,
    transporte_nombre,
    porcentaje_costo_transporte,
    costo_transporte,
    codigo_descuento_id: codigo_id_validado,
    monto_descuento,
  })

  // Crear items (excluir campo interno _mayorista_id)
  await Promise.all(itemsCalc.map((item: any) => {
    const { _mayorista_id, ...itemData } = item
    return svc.createOrdenItems({ ...itemData, orden_id: orden.id })
  }))

  const itemsCreados = await svc.listOrdenItems({ orden_id: orden.id })

  // Notificar al mayorista (email + push) — sin bloquear la respuesta
  try {
    const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)
    const mayoristaModSvc: any = req.scope.resolve(MAYORISTA_MODULE)
    const [comercio, mayorista] = await Promise.all([
      comercioSvc.retrieveComercio(payload.comercio_id).catch(() => null),
      mayoristaModSvc.retrieveMayorista(mayorista_id).catch(() => null),
    ])
    if (mayorista) {
      notificarNuevaOrden({
        mayorista_email: mayorista.email,
        mayorista_nombre: mayorista.nombre,
        mayorista_push_token: mayorista.push_token,
        numero,
        comercio_nombre: comercio?.nombre || "Un comercio",
        items: itemsCalc.map((i: any) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          unidad: i.unidad,
          precio_unitario: i.precio_unitario,
        })),
        total,
        notas: notas || undefined,
        medio_pago_nombre: medio_pago_nombre || undefined,
        transporte_nombre: transporte_nombre || undefined,
      }).catch((e: any) => console.error("[notif] nueva orden:", e))
    }

    // Webhook externo del mayorista (si tiene API key con webhook_url configurado)
    dispararWebhookMayorista(mayorista_id, "orden.nueva", {
      orden_id: orden.id,
      numero,
      total,
      comercio_id: payload.comercio_id,
      comercio_nombre: comercio?.nombre || null,
      items: itemsCalc.length,
    })
  } catch (e) {
    console.error("[notif] error preparando notificación:", e)
  }

  return res.status(201).json({ orden: { ...orden, items: itemsCreados } })
}
