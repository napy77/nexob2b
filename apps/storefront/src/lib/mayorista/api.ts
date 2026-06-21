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

export const mayoristasApi = {
  registro: async (data: Record<string, unknown>) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/auth`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ email, password }),
    })
    return handleResponse(res)
  },

  getMe: async (token: string) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/me`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },

  updateMe: async (token: string, data: Record<string, unknown>) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/me`, {
      method: "PUT",
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  getContactos: async (token: string, estado?: string) => {
    const qs = estado ? `?estado=${estado}` : ""
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/contactos${qs}`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },

  actualizarContacto: async (token: string, solicitudId: string, estado: string) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/contactos/${solicitudId}`, {
      method: "PUT",
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado }),
    })
    return handleResponse(res)
  },
}

export const productosApi = {
  listar: async (token: string) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/productos`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },

  obtener: async (token: string, id: string) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/productos/${id}`, {
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },

  crear: async (token: string, data: Record<string, unknown>) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/productos`, {
      method: "POST",
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  actualizar: async (token: string, id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/productos/${id}`, {
      method: "PUT",
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  eliminar: async (token: string, id: string) => {
    const res = await fetch(`${BACKEND_URL}/store/mayoristas/productos/${id}`, {
      method: "DELETE",
      headers: { ...baseHeaders(), Authorization: `Bearer ${token}` },
    })
    return handleResponse(res)
  },
}

// Convierte un File a base64 data URL
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const RUBROS_DISPONIBLES = [
  "Alimentos y bebidas",
  "Limpieza y hogar",
  "Electrónica",
  "Indumentaria y calzado",
  "Ferretería y construcción",
  "Farmacia y perfumería",
  "Librería y papelería",
  "Juguetes y entretenimiento",
  "Automotor",
  "Otros",
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
