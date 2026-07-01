/**
 * NexoB2B · Adaptador Mercado Pago — Marketplace Split
 * -------------------------------------------------------
 * - Usa el access_token del MAYORISTA (OAuth) para crear la preferencia
 * - La plata va directo a la cuenta MP del mayorista
 * - NexoB2B cobra marketplace_fee (comisión %) a su cuenta de plataforma
 * - Secretos siempre en backend, jamás en frontend
 */

import crypto from "crypto"
import { getConfig } from "./config-store"
import { getMPCuenta } from "./mp-oauth"

const API = "https://api.mercadopago.com"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PreferenciaResult {
  preference_id: string
  /** sandbox_init_point en TEST, init_point en producción */
  url_pago: string
}

// ─── Crear preferencia con split ─────────────────────────────────────────────

export async function crearPreferenciaMP(params: {
  ordenId: string
  numero: string
  total: number
  mayorista_id: string
  mayoristaNombre?: string
  comercioEmail?: string
}): Promise<PreferenciaResult> {
  // 1. Token del mayorista (su propia cuenta MP)
  const cuenta = await getMPCuenta(params.mayorista_id)
  if (!cuenta) {
    throw new Error(
      "El mayorista no tiene su cuenta de Mercado Pago conectada. Pedile que la vincule en Medios de Pago."
    )
  }
  const accessToken = cuenta.access_token

  // 2. Comisión de plataforma
  const comisionPctStr = await getConfig("mp_comision_pct")
  const comisionPct = parseFloat(comisionPctStr || "0.3")
  const marketplace_fee = Math.round(params.total * comisionPct) / 100

  const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || "https://nexob2b.app"
  const backendUrl  = process.env.APP_URL || "https://nexob2b.app"

  const titulo = params.mayoristaNombre
    ? `Pedido ${params.numero} — ${params.mayoristaNombre}`
    : `Pedido ${params.numero} — NexoB2B`

  const body: Record<string, unknown> = {
    items: [
      {
        id: params.ordenId,
        title: titulo,
        quantity: 1,
        currency_id: "ARS",
        unit_price: Math.round(params.total * 100) / 100,
      },
    ],
    marketplace_fee,
    external_reference: params.ordenId,
    back_urls: {
      success: `${frontendUrl}/comercio/pedidos/${params.ordenId}?pago=ok`,
      pending: `${frontendUrl}/comercio/pedidos/${params.ordenId}?pago=pendiente`,
      failure: `${frontendUrl}/comercio/pedidos/${params.ordenId}?pago=error`,
    },
    auto_return: "approved",
    notification_url: `${backendUrl}/webhooks/mp`,
  }

  if (params.comercioEmail) {
    body.payer = { email: params.comercioEmail }
  }

  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`MP error ${res.status}: ${detail}`)
  }

  const pref = (await res.json()) as {
    id: string
    init_point: string
    sandbox_init_point: string
  }

  const isTest = accessToken.startsWith("TEST-")

  return {
    preference_id: pref.id,
    url_pago: isTest ? pref.sandbox_init_point : pref.init_point,
  }
}

// ─── Consultar pago ───────────────────────────────────────────────────────────

export async function consultarPagoMP(
  pagoId: string,
  mayorista_id?: string
): Promise<{
  external_reference: string
  status: string
  status_detail: string
} | null> {
  // Usar el token del mayorista si está disponible, sino fallback al de plataforma
  let accessToken: string | null = null

  if (mayorista_id) {
    const cuenta = await getMPCuenta(mayorista_id).catch(() => null)
    if (cuenta) accessToken = cuenta.access_token
  }

  if (!accessToken) {
    accessToken = await getConfig("mp_access_token")
  }

  if (!accessToken) return null

  const res = await fetch(`${API}/v1/payments/${pagoId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null

  return res.json() as Promise<{
    external_reference: string
    status: string
    status_detail: string
  }>
}

// ─── Mapear estado ────────────────────────────────────────────────────────────

export function mapearEstadoMP(status: string): string {
  switch (status) {
    case "approved":     return "aprobado"
    case "rejected":     return "rechazado"
    case "refunded":
    case "charged_back": return "reembolsado"
    case "cancelled":    return "cancelado"
    case "in_process":
    case "authorized":   return "en_proceso"
    default:             return "pendiente"
  }
}

// ─── Validar firma del webhook ────────────────────────────────────────────────

export function validarFirmaMP(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): boolean {
  if (!secret || !xSignature) return false
  try {
    const partes = Object.fromEntries(
      xSignature
        .split(",")
        .map((p) => p.split("=").map((s) => s.trim()) as [string, string])
    )
    const ts = partes["ts"]
    const v1 = partes["v1"]
    if (!ts || !v1) return false

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const esperado = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex")

    return crypto.timingSafeEqual(
      Buffer.from(esperado, "hex"),
      Buffer.from(v1, "hex")
    )
  } catch {
    return false
  }
}
