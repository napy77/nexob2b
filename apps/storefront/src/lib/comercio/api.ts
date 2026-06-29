const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const baseHeaders = () => ({
  "Content-Type": "application/json",
  "x-publishable-api-key": PUB_KEY,
})

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function handleResponse(res: Response) {
  const data = await res.json()
  if (!res.ok) throw new ApiError(data.error || data.message || "Error desconocido", res.status)
  return data
}

export { ApiError }

export const comerciosApi = {
  registro: async (data: Record<string, unknown>) => {
    const res = await fetch(`${BACKEND_URL}/store/comercios`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${BACKEND_URL}/store/comercios/auth`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ email, password }),
    })
    return handleResponse(res)
  },

  getMe: async (token: string) => {
    const res = await fetch(`${BACKEND_URL}/store/comercios/me`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },

  updateMe: async (token: string, data: Record<string, unknown>) => {
    const res = await fetch(`${BACKEND_URL}/store/comercios/me`, {
      method: "PUT",
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  getCatalogo: async (token: string, filtros?: { rubro?: string; mayorista_id?: string }) => {
    const params = new URLSearchParams()
    if (filtros?.rubro) params.set("rubro", filtros.rubro)
    if (filtros?.mayorista_id) params.set("mayorista_id", filtros.mayorista_id)
    const qs = params.toString() ? `?${params.toString()}` : ""
    const res = await fetch(`${BACKEND_URL}/store/comercios/catalogo${qs}`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },

  getMayoristas: async (
    token: string,
    filtros?: { lat?: number | null; lng?: number | null; radio_km?: number; rubros?: string[]; busqueda?: string }
  ) => {
    const params = new URLSearchParams()
    if (filtros?.lat != null) params.set("lat", String(filtros.lat))
    if (filtros?.lng != null) params.set("lng", String(filtros.lng))
    if (filtros?.radio_km != null) params.set("radio_km", String(filtros.radio_km))
    if (filtros?.rubros?.length) filtros.rubros.forEach((r) => params.append("rubros", r))
    if (filtros?.busqueda) params.set("busqueda", filtros.busqueda)
    const qs = params.toString() ? `?${params.toString()}` : ""
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/lista${qs}`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },

  getCatalogoMayorista: async (token: string, mayoristaId: string) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/${mayoristaId}/catalogo`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },

  solicitarAlta: async (token: string, mayorista_id: string, mensaje?: string) => {
    const res = await fetch(`${BACKEND_URL}/store/solicitudes`, {
      method: "POST",
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mayorista_id, mensaje }),
    })
    return handleResponse(res)
  },

  getMisSolicitudes: async (token: string) => {
    const res = await fetch(`${BACKEND_URL}/store/solicitudes`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },
}

export const RUBROS_DISPONIBLES = [
  "Almacén / Kiosco",
  "Restaurante / Bar",
  "Supermercado / Minimarket",
  "Ferretería",
  "Farmacia / Perfumería",
  "Indumentaria",
  "Electrónica",
  "Librería / Papelería",
  "Juguetería",
  "Otro",
]

export const PROVINCIAS_ARGENTINA = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
]
