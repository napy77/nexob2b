import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../../modules/orden"
import { COMERCIO_MODULE } from "../../../../../../modules/comercio"
import { MAYORISTA_MODULE } from "../../../../../../modules/mayorista"
import jwt from "jsonwebtoken"
import { notificarCambioEstado } from "../../../../../../lib/notifications"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
  } catch { return null }
}

const TRANSICIONES: Record<string, string[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["enviado", "cancelado"],
  enviado: [],      // el comercio marca como entregado
  entregado: [],
  cancelado: [],
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

  // Info del comercio
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

  const { estado } = req.body as any
  const transicionesValidas = TRANSICIONES[orden.estado] || []
  if (!transicionesValidas.includes(estado)) {
    return res.status(400).json({
      error: `No se puede pasar de "${orden.estado}" a "${estado}"`
    })
  }

  const updated = await svc.updateOrdens({ id: orden.id, estado })

  // Notificar al comercio (y vendedor si hay) — sin bloquear la respuesta
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
      }).catch((e: any) => console.error("[notif] cambio estado:", e))
    }
  } catch (e) {
    console.error("[notif] error preparando notificación:", e)
  }

  return res.json({ orden: updated })
}
