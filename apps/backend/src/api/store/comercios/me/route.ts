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
  const { nombre, telefono, direccion, ciudad, provincia, rubros } = req.body as any

  const updateData: Record<string, any> = { id: payload.comercio_id }
  if (nombre !== undefined) updateData.nombre = nombre
  if (telefono !== undefined) updateData.telefono = telefono
  if (direccion !== undefined) updateData.direccion = direccion
  if (ciudad !== undefined) updateData.ciudad = ciudad
  if (provincia !== undefined) updateData.provincia = provincia
  if (rubros !== undefined) updateData.rubros = rubros

  const comercio = await comercioService.updateComercios(updateData)
  const { password_hash, ...comercioSafe } = comercio as any
  res.json({ comercio: comercioSafe })
}
