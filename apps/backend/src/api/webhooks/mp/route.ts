import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPool } from "../../../lib/db-seq"
import { getConfig } from "../../../lib/config-store"
import {
  consultarPagoMP,
  mapearEstadoMP,
  validarFirmaMP,
} from "../../../lib/pagos-mp"

// POST /webhooks/mp
// Recibe notificaciones de Mercado Pago. Responde 200 inmediatamente y
// procesa en background para no hacer esperar a MP.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  res.status(200).end()
  procesarWebhook(req).catch((e) =>
    console.error("[MP Webhook] Error al procesar:", e)
  )
}

async function procesarWebhook(req: MedusaRequest) {
  const body = req.body as any
  const query = req.query as any

  // Validar firma si hay secret configurado
  const webhookSecret =
    (await getConfig("mp_webhook_secret")) || process.env.MP_WEBHOOK_SECRET || ""

  if (webhookSecret) {
    const xSig = String(req.headers["x-signature"] || "")
    const xReqId = String(req.headers["x-request-id"] || "")
    const dataId = String(query["data.id"] || body?.data?.id || "")
    if (!validarFirmaMP(xSig, xReqId, dataId, webhookSecret)) {
      console.warn("[MP Webhook] Firma inválida, ignorando notificación")
      return
    }
  }

  const tipo = query.type || body.type
  if (tipo !== "payment") return

  const pagoId = String(body?.data?.id || query["data.id"] || "")
  if (!pagoId) return

  const pago = await consultarPagoMP(pagoId)
  if (!pago?.external_reference) {
    console.warn(`[MP Webhook] No se pudo consultar pago ${pagoId}`)
    return
  }

  const estadoMP = mapearEstadoMP(pago.status)
  const ordenId = pago.external_reference

  try {
    await getPool().query(
      `UPDATE orden SET mp_pago_id = $1, mp_estado_pago = $2 WHERE id = $3`,
      [pagoId, estadoMP, ordenId]
    )
    console.log(
      `[MP Webhook] Orden ${ordenId}: pago ${pagoId} → ${estadoMP} (${pago.status_detail})`
    )
  } catch (e) {
    console.error("[MP Webhook] Error actualizando orden:", e)
  }
}
