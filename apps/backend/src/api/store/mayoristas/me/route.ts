import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import MayoristaModuleService from "../../../../modules/mayorista/service"
import jwt from "jsonwebtoken"

const verifyToken = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const token = auth.split(" ")[1]
    return jwt.verify(token, process.env.JWT_SECRET!) as { mayorista_id: string }
  } catch {
    return null
  }
}

// GET /store/mayoristas/me — perfil del mayorista autenticado
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const mayoristaService: MayoristaModuleService = req.scope.resolve(MAYORISTA_MODULE)
  const mayorista = await mayoristaService.retrieveMayorista(payload.mayorista_id)

  const { password_hash, ...mayoristaSafe } = mayorista as any
  res.json({ mayorista: mayoristaSafe })
}

// PUT /store/mayoristas/me — actualizar perfil
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const mayoristaService: MayoristaModuleService = req.scope.resolve(MAYORISTA_MODULE)

  const { nombre, telefono, direccion, ciudad, provincia, rubros, zonas, visibilidad, descripcion } = req.body as any

  const updateData: Record<string, any> = { id: payload.mayorista_id }
  if (nombre !== undefined) updateData.nombre = nombre
  if (telefono !== undefined) updateData.telefono = telefono
  if (direccion !== undefined) updateData.direccion = direccion
  if (ciudad !== undefined) updateData.ciudad = ciudad
  if (provincia !== undefined) updateData.provincia = provincia
  if (rubros !== undefined) updateData.rubros = rubros
  if (zonas !== undefined) updateData.zonas = zonas
  if (visibilidad !== undefined) updateData.visibilidad = visibilidad
  if (descripcion !== undefined) updateData.descripcion = descripcion

  const mayorista = await mayoristaService.updateMayoristas(updateData)

  const { password_hash, ...mayoristaSafe } = mayorista as any
  res.json({ mayorista: mayoristaSafe })
}
