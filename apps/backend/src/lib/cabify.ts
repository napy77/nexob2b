/**
 * lib/cabify.ts — Cliente Cabify Logistics API
 *
 * Docs: https://developers.cabify.com/docs/introduction
 * Sandbox base URL: https://logistics.api.cabify-sandbox.com/v1
 * Producción base URL: https://logistics.api.cabify.com/v1
 *
 * Flujo:
 *  1. createParcels()  → crea uno o más paquetes (no dispara entrega)
 *  2. shipParcels()    → programa el pickup y activa la entrega
 *  3. getParcel()      → consulta estado + tracking
 */

export interface CabifyLocation {
  /** Coordenadas GPS  */
  loc?: { lat: number; lng: number }
  /** Dirección en texto (Cabify la geolocaliza) */
  addr?: string
  /** ID de hub registrado en Cabify */
  hub_external_id?: string
}

export interface CabifyContactInfo {
  name: string
  phone?: string
  email?: string
}

export interface CabifyParcelInput {
  /** Tu propio ID de referencia (ej: orden ID de Nexo) */
  external_id: string
  pickup_info: CabifyLocation & { contact?: CabifyContactInfo }
  dropoff_info: CabifyLocation & { contact?: CabifyContactInfo }
  dimensions?: { length_cm: number; width_cm: number; height_cm: number }
  weight?: { value: number; unit: "kg" | "g" }
  /** Para cobro contra entrega */
  price?: { amount: number; currency: string }
}

export interface CabifyParcel {
  id: string
  external_id: string
  pickup_info: any
  dropoff_info: any
  dimensions: any
  weight: any
  price: any
  created_at: string
  updated_at: string
  status?: string
  tracking_number?: string
}

export interface CabifyConfig {
  api_key: string
  sandbox?: boolean
}

function baseUrl(sandbox: boolean): string {
  return sandbox
    ? "https://logistics.api.cabify-sandbox.com/v1"
    : "https://logistics.api.cabify.com/v1"
}

function authHeaders(api_key: string) {
  return {
    "Authorization": `Bearer ${api_key}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  }
}

/**
 * Crea uno o más paquetes en Cabify (no despacha todavía).
 */
export async function createParcels(
  config: CabifyConfig,
  parcels: CabifyParcelInput[]
): Promise<CabifyParcel[]> {
  const url = `${baseUrl(!!config.sandbox)}/parcels`
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(config.api_key),
    body: JSON.stringify({ parcels }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cabify createParcels error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.parcels as CabifyParcel[]
}

/**
 * Despacha los paquetes creados — programa el pickup y activa la entrega.
 * shipping_type: "express" | "same_day" | "next_day"
 */
export async function shipParcels(
  config: CabifyConfig,
  parcel_ids: string[],
  shipping_type: "express" | "same_day" | "next_day" = "same_day"
): Promise<any> {
  const url = `${baseUrl(!!config.sandbox)}/parcels/ship`
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(config.api_key),
    body: JSON.stringify({ parcel_ids, shipping_type }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cabify shipParcels error ${res.status}: ${err}`)
  }
  return res.json()
}

/**
 * Obtiene el estado y tracking de un paquete por su ID de Cabify.
 */
export async function getParcel(config: CabifyConfig, parcel_id: string): Promise<CabifyParcel> {
  const url = `${baseUrl(!!config.sandbox)}/parcels/${parcel_id}`
  const res = await fetch(url, { headers: authHeaders(config.api_key) })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cabify getParcel error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.parcel as CabifyParcel
}

/**
 * Lista paquetes filtrados por estado.
 * status: "created" | "picked_up" | "in_transit" | "delivered" | "failed"
 */
export async function listParcels(
  config: CabifyConfig,
  filters?: { status?: string; external_id?: string }
): Promise<CabifyParcel[]> {
  const params = new URLSearchParams()
  if (filters?.status)      params.set("status", filters.status)
  if (filters?.external_id) params.set("external_id", filters.external_id)
  const url = `${baseUrl(!!config.sandbox)}/parcels?${params}`
  const res = await fetch(url, { headers: authHeaders(config.api_key) })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cabify listParcels error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.parcels as CabifyParcel[]
}

/**
 * Cancela un paquete (antes de ser recogido).
 */
export async function cancelParcel(config: CabifyConfig, parcel_id: string): Promise<void> {
  const url = `${baseUrl(!!config.sandbox)}/parcels/${parcel_id}/cancel`
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(config.api_key),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cabify cancelParcel error ${res.status}: ${err}`)
  }
}

/**
 * Motor de decisión NexoFlex.
 * Dado un envío (origen y destino), evalúa las reglas en orden
 * y retorna el transporte_id que debe usarse.
 *
 * reglas: lista ordenada por `orden ASC` (traídas de nexoflex_regla)
 */
export interface NexoflexEnvioContext {
  origen_ciudad?: string | null
  origen_provincia?: string | null
  destino_ciudad?: string | null
  destino_provincia?: string | null
  distancia_km?: number | null
}

export interface NexoflexRegla {
  id: string
  orden: number
  condicion: string
  condicion_valor: number | null
  transporte_id: string
  activo: boolean
}

export function resolverTransporteNexoflex(
  reglas: NexoflexRegla[],
  ctx: NexoflexEnvioContext
): string | null {
  const activas = reglas.filter(r => r.activo).sort((a, b) => a.orden - b.orden)
  for (const r of activas) {
    switch (r.condicion) {
      case "siempre":
        return r.transporte_id

      case "misma_ciudad":
        if (
          ctx.origen_ciudad &&
          ctx.destino_ciudad &&
          ctx.origen_ciudad.toLowerCase() === ctx.destino_ciudad.toLowerCase()
        ) return r.transporte_id
        break

      case "misma_provincia":
        if (
          ctx.origen_provincia &&
          ctx.destino_provincia &&
          ctx.origen_provincia.toLowerCase() === ctx.destino_provincia.toLowerCase() &&
          ctx.origen_ciudad?.toLowerCase() !== ctx.destino_ciudad?.toLowerCase()
        ) return r.transporte_id
        break

      case "distancia_km_lte":
        if (ctx.distancia_km != null && r.condicion_valor != null && ctx.distancia_km <= r.condicion_valor)
          return r.transporte_id
        break

      case "distancia_km_gt":
        if (ctx.distancia_km != null && r.condicion_valor != null && ctx.distancia_km > r.condicion_valor)
          return r.transporte_id
        break
    }
  }
  return null
}
