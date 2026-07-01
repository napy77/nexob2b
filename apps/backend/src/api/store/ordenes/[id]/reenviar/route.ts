/**
 * POST /store/ordenes/:id/reenviar
 * El comercio modifica y reenvía una orden en estado "devuelto".
 * Reemplaza los items con los nuevos, vuelve a pendiente.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ORDEN_MODULE } from "../../../../../modules/orden"
import jwt from "jsonwebtoken"

function verifyComercio(req: MedusaRequest): { comercio_id: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const payload = jwt.verify(
      auth.split(" ")[1],
      process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
    ) as any
    if (!payload.comercio_id) return null
    return { comercio_id: payload.comercio_id }
  } catch { return null }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyComercio(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)

  if (!orden || orden.comercio_id !== payload.comercio_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }
  if (orden.estado !== "devuelto") {
    return res.status(400).json({ error: "Solo se pueden reenviar órdenes devueltas" })
  }

  const { items } = req.body as any
  if (!items?.length) {
    return res.status(400).json({ error: "Debe incluir al menos un item" })
  }

  // Recalcular totales con los nuevos items
  let total_neto = 0
  let total_iva = 0
  const itemsCalc = items.map((item: any) => {
    const neto = item.precio_unitario * item.cantidad
    const iva = neto * (item.alicuota_iva / 100)
    total_neto += neto
    total_iva += iva
    return {
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
    }
  })

  const subtotal_con_iva = total_neto + total_iva
  const costo_mp = Number(orden.costo_medio_pago) || 0
  const costo_tr = Number(orden.costo_transporte) || 0
  const total = subtotal_con_iva + costo_mp + costo_tr

  // Eliminar items anteriores
  const itemsActuales = await svc.listOrdenItems({ orden_id: orden.id })
  for (const item of itemsActuales) {
    await svc.deleteOrdenItems(item.id)
  }

  // Crear nuevos items
  await Promise.all(
    itemsCalc.map((item: any) => svc.createOrdenItems({ ...item, orden_id: orden.id }))
  )

  // Volver a pendiente, limpiar mensaje
  const updated = await svc.updateOrdens({
    id: orden.id,
    estado: "pendiente",
    mensaje_mayorista: null,
    total_neto,
    total_iva,
    total,
  })

  const itemsNuevos = await svc.listOrdenItems({ orden_id: orden.id })
  return res.json({ orden: { ...updated, items: itemsNuevos } })
}
