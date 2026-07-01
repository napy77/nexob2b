import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../../modules/orden"
import { COMERCIO_MODULE } from "../../../../../../modules/comercio"
import { MAYORISTA_MODULE } from "../../../../../../modules/mayorista"
import jwt from "jsonwebtoken"
import { notificarCambioEstado } from "../../../../../../lib/notifications"
import { getPool } from "../../../../../../lib/db-seq"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
  } catch { return null }
}

const TRANSICIONES: Record<string, string[]> = {
  pendiente:  ["confirmado", "devuelto", "cancelado"],
  confirmado: ["enviado", "cancelado"],
  devuelto:   ["cancelado"],
  enviado:    [],
  entregado:  [],
  cancelado:  [],
}

// GET /store/mayoristas/me/ordenes/:id
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)
  if (!orden || orden.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }

  const items = await svc.listOrdenItems({ orden_id: orden.id }, { order: { created_at: "ASC" } })
  const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)
  const comercio = await comercioSvc.retrieveComercio(orden.comercio_id).catch(() => null)

  return res.json({ orden: { ...orden, items, comercio } })
}

// PUT /store/mayoristas/me/ordenes/:id — cambiar estado
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)
  if (!orden || orden.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }

  const { estado, mensaje_mayorista } = req.body as any
  const transicionesValidas = TRANSICIONES[orden.estado] || []
  if (!transicionesValidas.includes(estado)) {
    return res.status(400).json({
      error: `No se puede pasar de "${orden.estado}" a "${estado}"`
    })
  }

  // Al confirmar: descontar stock de cada item
  if (estado === "confirmado") {
    const items = await svc.listOrdenItems({ orden_id: orden.id })
    const pool = getPool()
    const sinStock: string[] = []

    for (const item of items) {
      const result = await pool.query(
        `UPDATE producto
         SET stock = stock - $1
         WHERE id = $2
           AND stock IS NOT NULL
           AND stock >= $1
         RETURNING id`,
        [item.cantidad, item.producto_id]
      )
      // Verificar si tenía stock pero era insuficiente
      const { rows: conStock } = await pool.query(
        `SELECT stock FROM producto WHERE id = $1 AND stock IS NOT NULL`,
        [item.producto_id]
      )
      if (conStock.length > 0 && result.rowCount === 0) {
        sinStock.push(`${item.nombre} (disponible: ${conStock[0].stock}, pedido: ${item.cantidad})`)
      }
    }

    if (sinStock.length > 0) {
      return res.status(400).json({
        error: "Stock insuficiente para confirmar. Devolvé el pedido con un mensaje al comercio.",
        detalle: sinStock,
      })
    }
  }

  // Al cancelar desde confirmado: restaurar stock
  if (estado === "cancelado" && orden.estado === "confirmado") {
    const items = await svc.listOrdenItems({ orden_id: orden.id })
    const pool = getPool()
    for (const item of items) {
      await pool.query(
        `UPDATE producto SET stock = stock + $1 WHERE id = $2 AND stock IS NOT NULL`,
        [item.cantidad, item.producto_id]
      )
    }
  }

  const updateData: any = { id: orden.id, estado }
  if (estado === "devuelto") {
    updateData.mensaje_mayorista = mensaje_mayorista || null
  }
  if (estado === "confirmado") {
    updateData.mensaje_mayorista = null
  }

  const updated = await svc.updateOrdens(updateData)

  // Notificar al comercio — sin bloquear
  try {
    const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)
    const mayoristaModSvc: any = req.scope.resolve(MAYORISTA_MODULE)
    const [comercio, mayorista] = await Promise.all([
      comercioSvc.retrieveComercio(orden.comercio_id).catch(() => null),
      mayoristaModSvc.retrieveMayorista(orden.mayorista_id).catch(() => null),
    ])
    let vendedorPushToken: string | null = null
    if (orden.vendedor_id) {
      const vendedor = await mayoristaModSvc.retrieveVendedor(orden.vendedor_id).catch(() => null)
      vendedorPushToken = vendedor?.push_token || null
    }
    if (comercio) {
      notificarCambioEstado({
        comercio_email: comercio.email,
        comercio_push_token: comercio.push_token,
        vendedor_push_token: vendedorPushToken,
        numero: orden.numero,
        estado,
        mayorista_nombre: mayorista?.nombre || "El mayorista",
        total: orden.total,
        notas_mayorista: mensaje_mayorista || undefined,
      }).catch((e: any) => console.error("[notif] cambio estado:", e))
    }
  } catch (e) {
    console.error("[notif] error preparando notificación:", e)
  }

  return res.json({ orden: updated })
}
