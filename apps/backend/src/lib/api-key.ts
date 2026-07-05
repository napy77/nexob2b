/**
 * Autenticación por API Key estática para integraciones externas.
 * Uso: header  X-API-Key: nxpos_xxxx  |  X-API-Key: nxmay_xxxx
 */
import { getPool } from "./db-seq"

export type ApiKeyRow = {
  id: string
  key: string
  nombre: string
  tipo: "nexopos" | "mayorista"
  entidad_id: string  // comercio_id o mayorista_id
  activa: boolean
  webhook_url: string | null
}

/**
 * Verifica el header X-API-Key.
 * Si `tipo` está definido, rechaza keys de otro tipo.
 * Actualiza ultimo_uso async (sin bloquear).
 */
export async function verifyApiKey(
  req: { headers: Record<string, string | string[] | undefined> },
  tipo?: "nexopos" | "mayorista"
): Promise<ApiKeyRow | null> {
  const raw = req.headers["x-api-key"]
  const key = Array.isArray(raw) ? raw[0] : raw
  if (!key) return null

  const pool = getPool()
  const { rows } = await pool.query<ApiKeyRow>(
    `SELECT id, key, nombre, tipo, entidad_id, activa, webhook_url
     FROM api_key
     WHERE key = $1 AND activa = true AND deleted_at IS NULL
     LIMIT 1`,
    [key]
  )
  const row = rows[0]
  if (!row) return null
  if (tipo && row.tipo !== tipo) return null

  // Actualizar ultimo_uso sin await
  pool.query("UPDATE api_key SET ultimo_uso = now() WHERE id = $1", [row.id]).catch(() => {})

  return row
}

/**
 * Genera una API key con prefijo según tipo.
 */
export function generarKey(tipo: "nexopos" | "mayorista"): string {
  const prefix = tipo === "nexopos" ? "nxpos_" : "nxmay_"
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
  return prefix + rand
}

/**
 * Dispara el webhook del mayorista de forma async (best-effort, no bloquea).
 * Si falla, solo loguea — nunca lanza excepción.
 */
export function dispararWebhookMayorista(
  mayorista_id: string,
  evento: string,
  payload: object
): void {
  getPool()
    .query<{ webhook_url: string }>(
      `SELECT webhook_url FROM api_key
       WHERE entidad_id = $1 AND tipo = 'mayorista' AND activa = true
         AND webhook_url IS NOT NULL AND deleted_at IS NULL
       LIMIT 1`,
      [mayorista_id]
    )
    .then(({ rows }) => {
      if (!rows[0]?.webhook_url) return
      const url = rows[0].webhook_url
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nexo-Event": evento },
        body: JSON.stringify({ evento, timestamp: new Date().toISOString(), ...payload }),
        signal: AbortSignal.timeout(8000),
      }).catch((e: Error) => console.warn(`[webhook] Falló POST ${url}:`, e.message))
    })
    .catch((e: Error) => console.warn("[webhook] Error buscando URL:", e.message))
}
