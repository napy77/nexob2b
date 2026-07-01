/**
 * NexoB2B · MP Marketplace OAuth
 * --------------------------------
 * - Cifrado AES-256-CBC de tokens en reposo
 * - Generación de URL de autorización
 * - Intercambio de code por access_token
 * - CRUD en mayorista_mp_cuenta
 */

import crypto from "crypto"
import { getConfig } from "./config-store"
import { getPool } from "./db-seq"

// ─── Cifrado ─────────────────────────────────────────────────────────────────

function encKey(): Buffer {
  const raw = process.env.MP_ENCRYPTION_KEY || "nexob2b_mp_token_encryption_2026!!"
  // AES-256 necesita exactamente 32 bytes
  return Buffer.from(raw.padEnd(32, "0").slice(0, 32))
}

export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", encKey(), iv)
  let enc = cipher.update(text, "utf8", "hex")
  enc += cipher.final("hex")
  return iv.toString("hex") + ":" + enc
}

export function decryptToken(enc: string): string {
  const [ivHex, data] = enc.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-cbc", encKey(), iv)
  let dec = decipher.update(data, "hex", "utf8")
  dec += decipher.final("utf8")
  return dec
}

// ─── URLs ────────────────────────────────────────────────────────────────────

const MP_AUTH_URL = "https://auth.mercadopago.com.ar/authorization"
const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token"

function getRedirectUri(): string {
  const base = process.env.FRONTEND_URL || process.env.APP_URL || "https://nexob2b.app"
  return `${base}/mayorista/mp-callback`
}

// ─── Generar URL de conexión ─────────────────────────────────────────────────

export async function getMPConnectUrl(state: string): Promise<string> {
  const clientId = await getConfig("mp_client_id")
  if (!clientId) {
    throw new Error("mp_client_id no configurado. Agregalo en Parámetros → Mercado Pago.")
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: getRedirectUri(),
    state,
  })
  return `${MP_AUTH_URL}?${params.toString()}`
}

// ─── Intercambiar code por tokens ─────────────────────────────────────────────

export async function exchangeMPCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  mp_user_id: string
  mp_nickname: string
  public_key: string | null
  live_mode: boolean
}> {
  const clientId = await getConfig("mp_client_id")
  const clientSecret = await getConfig("mp_client_secret")

  if (!clientId || !clientSecret) {
    throw new Error("Credenciales OAuth (client_id / client_secret) no configuradas en Parámetros.")
  }

  const res = await fetch(MP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MP OAuth error ${res.status}: ${err}`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    user_id: number
    public_key?: string
    live_mode: boolean
  }

  // Buscar nickname en la API de usuarios de MP
  let mp_nickname = `Usuario ${data.user_id}`
  try {
    const uRes = await fetch(`https://api.mercadopago.com/users/${data.user_id}`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (uRes.ok) {
      const u = (await uRes.json()) as { nickname?: string; email?: string }
      mp_nickname = u.nickname || u.email || mp_nickname
    }
  } catch { /* no crítico */ }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    mp_user_id: String(data.user_id),
    mp_nickname,
    public_key: data.public_key || null,
    live_mode: data.live_mode,
  }
}

// ─── DB: leer cuenta MP del mayorista ────────────────────────────────────────

export async function getMPCuenta(mayorista_id: string): Promise<{
  mp_user_id: string
  mp_nickname: string
  public_key: string | null
  live_mode: boolean
  access_token: string
  refresh_token: string | null
} | null> {
  const { rows } = await getPool().query(
    `SELECT * FROM "mayorista_mp_cuenta" WHERE mayorista_id = $1`,
    [mayorista_id]
  )
  if (!rows[0]) return null
  const r = rows[0]
  return {
    mp_user_id: r.mp_user_id,
    mp_nickname: r.mp_nickname,
    public_key: r.public_key,
    live_mode: r.live_mode,
    access_token: decryptToken(r.access_token_enc),
    refresh_token: r.refresh_token_enc ? decryptToken(r.refresh_token_enc) : null,
  }
}

// ─── DB: guardar / actualizar cuenta MP ──────────────────────────────────────

export async function upsertMPCuenta(
  mayorista_id: string,
  data: {
    mp_user_id: string
    mp_nickname: string
    access_token: string
    refresh_token: string
    public_key: string | null
    live_mode: boolean
  }
): Promise<void> {
  await getPool().query(
    `INSERT INTO "mayorista_mp_cuenta"
       (mayorista_id, mp_user_id, mp_nickname, access_token_enc, refresh_token_enc, public_key, live_mode, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,now())
     ON CONFLICT (mayorista_id) DO UPDATE SET
       mp_user_id        = EXCLUDED.mp_user_id,
       mp_nickname       = EXCLUDED.mp_nickname,
       access_token_enc  = EXCLUDED.access_token_enc,
       refresh_token_enc = EXCLUDED.refresh_token_enc,
       public_key        = EXCLUDED.public_key,
       live_mode         = EXCLUDED.live_mode,
       updated_at        = now()`,
    [
      mayorista_id,
      data.mp_user_id,
      data.mp_nickname,
      encryptToken(data.access_token),
      encryptToken(data.refresh_token),
      data.public_key,
      data.live_mode,
    ]
  )
}

// ─── DB: eliminar cuenta MP ───────────────────────────────────────────────────

export async function deleteMPCuenta(mayorista_id: string): Promise<void> {
  await getPool().query(
    `DELETE FROM "mayorista_mp_cuenta" WHERE mayorista_id = $1`,
    [mayorista_id]
  )
}
