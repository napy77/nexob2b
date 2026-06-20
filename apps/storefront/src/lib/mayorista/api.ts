const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const baseHeaders = () => ({
  "Content-Type": "application/json",
  "x-publishable-api-key": PUB_KEY,
})

async function handleResponse(res: Response) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || "Error desconocido")
  return data
}

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
}

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
