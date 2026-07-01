import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import jwt from "jsonwebtoken"
import { ORDEN_MODULE } from "../../../../../modules/orden"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import { getPool } from "../../../../../lib/db-seq"
import { crearPreferenciaMP } from "../../../../../lib/pagos-mp"

const verifyComercio = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(
      auth.split(" ")[1],
      process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
    ) as { comercio_id: string }
  } catch {
    return null
  }
}

// POST /store/ordenes/:id/pagar
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyComercio(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(ORDEN_MODULE)
  const orden = await svc.retrieveOrden(req.params.id).catch(() => null)
  if (!orden || orden.comercio_id !== payload.comercio_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }

  if (orden.mp_estado_pago === "aprobado") {
    return res.status(400).json({ error: "Este pedido ya fue pagado con Mercado Pago" })
  }

  if (!["pendiente", "confirmado"].includes(orden.estado)) {
    return res.status(400).json({
      error: `No se puede pagar un pedido en estado "${orden.estado}"`,
    })
  }

  // Email del comercio (opcional, mejora la experiencia en MP)
  let comercioEmail: string | undefined
  try {
    const { rows } = await getPool().query(
      "SELECT email FROM comercio WHERE id = $1",
      [payload.comercio_id]
    )
    comercioEmail = rows[0]?.email
  } catch {}

  // Nombre del mayorista para el título de la preferencia
  let mayoristaNombre = ""
  try {
    const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
    const m = await mayoristaService.retrieveMayorista(orden.mayorista_id)
    mayoristaNombre = m?.nombre || ""
  } catch {}

  try {
    const result = await crearPreferenciaMP({
      ordenId: orden.id,
      numero: orden.numero,
      total: orden.total,
      mayoristaNombre,
      comercioEmail,
    })

    // Guardar preference_id vía SQL para no depender del ORM en runtime
    await getPool().query(
      `UPDATE orden SET mp_preference_id = $1, mp_estado_pago = 'pendiente' WHERE id = $2`,
      [result.preference_id, orden.id]
    )

    return res.json({
      url_pago: result.url_pago,
      preference_id: result.preference_id,
    })
  } catch (e: any) {
    console.error("[MP] Error creando preferencia:", e.message)
    return res.status(502).json({ error: e.message || "Error al iniciar el pago" })
  }
}
