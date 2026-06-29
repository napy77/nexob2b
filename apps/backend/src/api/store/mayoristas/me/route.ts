import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import MayoristaModuleService from "../../../../modules/mayorista/service"
import jwt from "jsonwebtoken"
import fs from "fs"
import path from "path"

const verifyToken = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const token = auth.split(" ")[1]
    return jwt.verify(token, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
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

  const { nombre, telefono, direccion, ciudad, provincia, rubros, zonas, visibilidad, descripcion, condicion_fiscal, logo_base64, lat, lng } = req.body as any

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
  if (condicion_fiscal !== undefined) updateData.condicion_fiscal = condicion_fiscal
  if (lat !== undefined) updateData.lat = lat
  if (lng !== undefined) updateData.lng = lng

  // Guardar logo si viene en base64
  if (logo_base64) {
    const match = logo_base64.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/)
    if (match) {
      const ext = match[1].split("/")[1].replace("jpeg", "jpg")
      const buffer = Buffer.from(match[2], "base64")
      const uploadDir = path.join(process.cwd(), ".medusa", "server", "public", "logos")
      fs.mkdirSync(uploadDir, { recursive: true })
      const filename = `logo_${payload.mayorista_id}.${ext}`
      fs.writeFileSync(path.join(uploadDir, filename), buffer)
      updateData.logo_url = `/logos/${filename}`
    }
  }

  const mayorista = await mayoristaService.updateMayoristas(updateData)

  const { password_hash, ...mayoristaSafe } = mayorista as any
  res.json({ mayorista: mayoristaSafe })
}
