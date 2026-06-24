import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../../modules/comercio"
import jwt from "jsonwebtoken"

const verifyToken = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const token = auth.split(" ")[1]
    return jwt.verify(token, process.env.JWT_SECRET!) as { comercio_id: string }
  } catch {
    return null
  }
}

async function geocodificar(dir: string, ciudad: string, provincia: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_KEY
  if (!key) return null
  const q = encodeURIComponent(`${dir}, ${ciudad}, ${provincia}, Argentina`)
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${key}`)
    const data: any = await r.json()
    if (data.status === "OK" && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location
      return { lat, lng }
    }
  } catch {}
  return null
}

// GET /store/comercios/me
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  const comercio = await comercioService.retrieveComercio(payload.comercio_id)

  const { password_hash, ...comercioSafe } = comercio as any
  res.json({ comercio: comercioSafe })
}

// PUT /store/comercios/me
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  const { nombre, telefono, direccion, ciudad, provincia, rubros, condicion_fiscal } = req.body as any

  const updateData: Record<string, any> = { id: payload.comercio_id }
  if (nombre !== undefined) updateData.nombre = nombre
  if (telefono !== undefined) updateData.telefono = telefono
  if (direccion !== undefined) updateData.direccion = direccion
  if (ciudad !== undefined) updateData.ciudad = ciudad
  if (provincia !== undefined) updateData.provincia = provincia
  if (rubros !== undefined) updateData.rubros = rubros
  if (condicion_fiscal !== undefined) updateData.condicion_fiscal = condicion_fiscal

  // Si el frontend manda lat/lng directamente (desde mapa interactivo), usarlos
  const { lat, lng } = req.body as any
  if (lat !== undefined && lng !== undefined) {
    updateData.lat = parseFloat(lat)
    updateData.lng = parseFloat(lng)
  } else if (direccion !== undefined || ciudad !== undefined || provincia !== undefined) {
    // Auto-geocodificar si hay datos de ubicación pero no coordenadas explícitas
    const actual = await comercioService.retrieveComercio(payload.comercio_id)
    const dirFinal = (direccion ?? actual.direccion ?? "").trim()
    const ciuFinal = (ciudad ?? actual.ciudad ?? "").trim()
    const provFinal = (provincia ?? actual.provincia ?? "").trim()
    if (dirFinal || ciuFinal || provFinal) {
      const geo = await geocodificar(dirFinal, ciuFinal, provFinal)
      if (geo) {
        updateData.lat = geo.lat
        updateData.lng = geo.lng
      }
    }
  }

  const comercio = await comercioService.updateComercios(updateData)
  const { password_hash, ...comercioSafe } = comercio as any
  res.json({ comercio: comercioSafe })
}
