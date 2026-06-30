import { BACKEND_URL, PUB_KEY } from "./config"

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function req(path: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${path}`
  console.log("[API] →", options.method || "GET", url)
  console.log("[API] PUB_KEY:", PUB_KEY ? PUB_KEY.slice(0, 20) + "..." : "VACÍO")
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUB_KEY,
        ...(options.headers || {}),
      },
    })
    console.log("[API] ← status:", res.status)
    const text = await res.text()
    console.log("[API] ← body:", text.slice(0, 300))
    let data: any
    try { data = JSON.parse(text) } catch {
      throw new Error(`Respuesta no-JSON (${res.status}): ${text.slice(0, 100)}`)
    }
    if (!res.ok) throw new ApiError(res.status, data.error || "Error")
    return data
  } catch (e: any) {
    console.log("[API] ERROR:", e?.message)
    throw e
  }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginComercio(email: string, password: string) {
  return req("/store/comercios/auth", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function registerComercio(body: {
  nombre: string
  cuit: string
  email: string
  password: string
  telefono?: string
  ciudad?: string
  provincia?: string
}) {
  return req("/store/comercios", { method: "POST", body: JSON.stringify(body) })
}

export async function getMe(token: string) {
  return req("/store/comercios/me", { headers: authHeaders(token) })
}

export async function registrarPushTokenComercio(token: string, pushToken: string) {
  return req("/store/comercios/me/push-token", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ push_token: pushToken }),
  })
}

export async function registrarPushTokenVendedor(token: string, pushToken: string) {
  return req("/store/vendedores/me/push-token", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ push_token: pushToken }),
  })
}

// ── Mayoristas ────────────────────────────────────────────────────────────────

export async function getMayoristas(token: string) {
  return req("/store/mayoristas/lista", { headers: authHeaders(token) })
}

export async function getCatalogoMayorista(token: string, mayoristaId: string) {
  return req(`/store/mayoristas/${mayoristaId}/catalogo`, {
    headers: authHeaders(token),
  })
}

export async function solicitarAlta(token: string, mayoristaId: string) {
  return req("/store/solicitudes", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ mayorista_id: mayoristaId }),
  })
}

// ── Órdenes ───────────────────────────────────────────────────────────────────

export async function crearOrden(
  token: string,
  body: {
    mayorista_id: string
    items: {
      producto_id: string
      nombre: string
      sku?: string | null
      ean?: string | null
      cantidad: number
      precio_unitario: number
      alicuota_iva: number
      unidad: string
    }[]
    notas?: string
    medio_pago_id?: string
    transporte_id?: string
  }
) {
  return req("/store/ordenes", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
}

export async function getOrdenes(token: string) {
  return req("/store/ordenes", { headers: authHeaders(token) })
}

export async function getOrden(token: string, id: string) {
  return req(`/store/ordenes/${id}`, { headers: authHeaders(token) })
}

export async function getDocumentosOrden(token: string, id: string) {
  return req(`/store/ordenes/${id}/documentos`, { headers: authHeaders(token) })
}

// ── Vendedor ───────────────────────────────────────────────────────────────────

export async function loginVendedor(email: string, password: string) {
  return req("/store/vendedores/auth", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function getMeVendedor(token: string) {
  return req("/store/vendedores/me", { headers: authHeaders(token) })
}

export async function getMisComerciosVendedor(token: string) {
  return req("/store/vendedores/me/comercios", { headers: authHeaders(token) })
}

export async function getCatalogoVendedor(token: string, busqueda?: string) {
  const qs = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : ""
  return req(`/store/vendedores/me/catalogo${qs}`, { headers: authHeaders(token) })
}

export async function getOrdenesVendedor(token: string) {
  return req("/store/vendedores/me/ordenes", { headers: authHeaders(token) })
}

export async function crearOrdenVendedor(
  token: string,
  body: {
    comercio_id: string
    items: {
      producto_id: string
      nombre: string
      sku?: string | null
      ean?: string | null
      cantidad: number
      precio_unitario: number
      alicuota_iva: number
      unidad: string
    }[]
    notas?: string
    medio_pago_id?: string
    transporte_id?: string
  }
) {
  return req("/store/vendedores/me/ordenes", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
}

export async function actualizarUbicacion(token: string, lat: number, lng: number) {
  return req("/store/vendedores/me/ubicacion", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ lat, lng }),
  })
}

// ── Rutas (vendedor) ───────────────────────────────────────────────────────────

export async function getRutaActiva(token: string) {
  return req("/store/vendedores/me/ruta", { headers: authHeaders(token) })
}

export async function iniciarRuta(token: string, rutaId: string) {
  return req(`/store/vendedores/me/ruta/${rutaId}/iniciar`, {
    method: "PUT",
    headers: authHeaders(token),
  })
}

export async function finalizarRuta(token: string, rutaId: string) {
  return req(`/store/vendedores/me/ruta/${rutaId}/finalizar`, {
    method: "PUT",
    headers: authHeaders(token),
  })
}

export async function accionarParada(
  token: string,
  rutaId: string,
  paradaId: string,
  accion: "visitar" | "omitir",
  notas?: string
) {
  return req(`/store/vendedores/me/ruta/${rutaId}/paradas/${paradaId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ accion, notas }),
  })
}

export async function enviarTrackRuta(token: string, rutaId: string, lat: number, lng: number) {
  return req(`/store/vendedores/me/ruta/${rutaId}/track`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ lat, lng }),
  })
}
