import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../modules/orden"
import { COMERCIO_MODULE } from "../../../modules/comercio"
import jwt from "jsonwebtoken"

const verifyComercio = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { comercio_id: string }
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
  const { mayorista_id, items, notas } = body

  if (!mayorista_id || !items?.length) {
    return res.status(400).json({ error: "Faltan mayorista_id o items" })
  }

  // Calcular totales
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
  const total = total_neto + total_iva

  const svc: any = req.scope.resolve(ORDEN_MODULE)

  // Número de orden legible: contar todas y sumar 1
  const todasOrdenes = await svc.listOrdens({})
  const numero = `ORD-${String(todasOrdenes.length + 1).padStart(5, "0")}`
  const orden = await svc.createOrdens({
    numero,
    comercio_id: payload.comercio_id,
    mayorista_id,
    estado: "pendiente",
    notas: notas || null,
    total_neto,
    total_iva,
    total,
  })

  // Crear items
  await Promise.all(itemsCalc.map((item: any) =>
    svc.createOrdenItems({ ...item, orden_id: orden.id })
  ))

  const itemsCreados = await svc.listOrdenItems({ orden_id: orden.id })
  return res.status(201).json({ orden: { ...orden, items: itemsCreados } })
}
