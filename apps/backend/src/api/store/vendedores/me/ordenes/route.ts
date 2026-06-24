import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ORDEN_MODULE } from "../../../../../modules/orden"
import { SOLICITUD_MODULE } from "../../../../../modules/solicitud"
import { COMERCIO_MODULE } from "../../../../../modules/comercio"
import jwt from "jsonwebtoken"

function verifyVendedor(req: MedusaRequest): { vendedor_id: string; mayorista_id: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const payload = jwt.verify(
      auth.split(" ")[1],
      process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
    ) as any
    if (payload.rol !== "vendedor") return null
    return { vendedor_id: payload.vendedor_id, mayorista_id: payload.mayorista_id }
  } catch {
    return null
  }
}

// GET /store/vendedores/me/ordenes — pedidos creados por este vendedor
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)

  const ordenes = await svc.listOrdens(
    { vendedor_id: payload.vendedor_id },
    { order: { created_at: "DESC" } }
  )

  // Enriquecer con items y nombre del comercio
  const ordenesCompletas = await Promise.all(ordenes.map(async (o: any) => {
    const items = await svc.listOrdenItems({ orden_id: o.id }, { order: { created_at: "ASC" } })
    let comercio_nombre = ""
    try {
      const c = await comercioSvc.retrieveComercio(o.comercio_id)
      comercio_nombre = c.nombre
    } catch {}
    return { ...o, items, comercio_nombre }
  }))

  return res.json({ ordenes: ordenesCompletas })
}

// POST /store/vendedores/me/ordenes — el vendedor crea un pedido para uno de sus comercios clientes
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const body = req.body as any
  const { comercio_id, items, notas } = body

  if (!comercio_id || !items?.length) {
    return res.status(400).json({ error: "Faltan comercio_id o items" })
  }

  // Verificar que el comercio está asignado a este vendedor
  const solicitudSvc: any = req.scope.resolve(SOLICITUD_MODULE)
  const solicitudes = await solicitudSvc.listSolicituds({
    vendedor_id: payload.vendedor_id,
    mayorista_id: payload.mayorista_id,
    comercio_id,
    estado: "aceptado",
  })

  if (solicitudes.length === 0) {
    return res.status(403).json({ error: "Este comercio no está asignado a vos" })
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

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const todasOrdenes = await svc.listOrdens({})
  const numero = `ORD-${String(todasOrdenes.length + 1).padStart(5, "0")}`

  const orden = await svc.createOrdens({
    numero,
    comercio_id,
    mayorista_id: payload.mayorista_id,
    vendedor_id: payload.vendedor_id,
    estado: "pendiente",
    notas: notas || null,
    total_neto,
    total_iva,
    total: total_neto + total_iva,
  })

  await Promise.all(itemsCalc.map((item: any) =>
    svc.createOrdenItems({ ...item, orden_id: orden.id })
  ))

  const itemsCreados = await svc.listOrdenItems({ orden_id: orden.id })
  return res.status(201).json({ orden: { ...orden, items: itemsCreados } })
}
