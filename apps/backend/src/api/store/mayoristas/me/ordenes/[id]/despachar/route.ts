/**
 * POST /store/mayoristas/me/ordenes/:id/despachar
 *
 * Crea el registro de Envio al despachar (cuando el estado ya es en_transporte).
 * Si el transporte tiene seguimiento propio → retorna la tracking_url.
 * Si no → retorna token_publico para generar el QR.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import jwt from "jsonwebtoken"
import { randomUUID } from "crypto"
import { ORDEN_MODULE } from "../../../../../../../modules/orden"
import { ENVIO_MODULE } from "../../../../../../../modules/envio"
import { TRANSPORTE_MODULE } from "../../../../../../../modules/transporte"
import { COMERCIO_MODULE } from "../../../../../../../modules/comercio"
import { getPool } from "../../../../../../../lib/db-seq"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
  } catch { return null }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { id } = req.params
  const ordenSvc: any = req.scope.resolve(ORDEN_MODULE)
  const envioSvc: any = req.scope.resolve(ENVIO_MODULE)
  const transporteSvc: any = req.scope.resolve(TRANSPORTE_MODULE)
  const comercioSvc: any = req.scope.resolve(COMERCIO_MODULE)

  const orden = await ordenSvc.retrieveOrden(id).catch(() => null)
  if (!orden || orden.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Orden no encontrada" })
  }
  if (orden.estado !== "en_transporte") {
    return res.status(400).json({ error: "La orden debe estar en estado 'en_transporte'" })
  }

  // Verificar si ya existe un envio para esta orden
  const { rows: existentes } = await getPool().query(
    `SELECT id, token_publico, tracking_url, tiene_seguimiento_propio FROM envio WHERE orden_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id]
  )
  if (existentes.length > 0) {
    return res.json({ envio: existentes[0], ya_existia: true })
  }

  // Datos del transporte
  let transporte: any = null
  if (orden.transporte_id) {
    transporte = await transporteSvc.retrieveTransporte(orden.transporte_id).catch(() => null)
  }

  // URL de tracking (interpolamos numero_guia si hay template)
  let trackingUrl: string | null = null
  if (transporte?.tracking_url_template && orden.numero_guia) {
    trackingUrl = transporte.tracking_url_template.replace("{numero_guia}", orden.numero_guia)
  }

  const tieneSeguimientoPropio = !!(transporte?.tiene_seguimiento_propio && trackingUrl)
  const tokenPublico = randomUUID()

  // Datos del destinatario
  let comercio: any = null
  try { comercio = await comercioSvc.retrieveComercio(orden.comercio_id) } catch {}

  const backendUrl = process.env.BACKEND_URL || "https://nexob2b.app"
  const seguimientoUrl = `${backendUrl}/seguimiento/${tokenPublico}`

  const envio = await envioSvc.createEnvios({
    orden_id: id,
    mayorista_id: payload.mayorista_id,
    transporte_id: orden.transporte_id || null,
    transporte_nombre: transporte?.nombre || orden.transporte_nombre || null,
    numero_guia: orden.numero_guia || null,
    token_publico: tokenPublico,
    tiene_seguimiento_propio: tieneSeguimientoPropio,
    tracking_url: tieneSeguimientoPropio ? trackingUrl : seguimientoUrl,
    destinatario_nombre: comercio?.nombre || null,
    destinatario_email: comercio?.email || null,
    destinatario_telefono: comercio?.telefono || null,
    destinatario_direccion: comercio?.direccion || null,
    estado: "en_camino",
    eventos: [{
      timestamp: new Date().toISOString(),
      estado: "en_camino",
      notas: "Pedido despachado",
    }],
    cantidad_bultos: orden.cantidad_bultos || null,
    peso_kg: orden.peso_kg || null,
    dimensiones: orden.dimensiones || null,
    orden_numero: orden.numero,
  })

  return res.status(201).json({
    envio,
    token_publico: tokenPublico,
    tiene_seguimiento_propio: tieneSeguimientoPropio,
    tracking_url: tieneSeguimientoPropio ? trackingUrl : null,
    seguimiento_url: !tieneSeguimientoPropio ? seguimientoUrl : null,
  })
}
