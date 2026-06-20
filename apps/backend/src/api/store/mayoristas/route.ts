import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../modules/mayorista"
import MayoristaModuleService from "../../../modules/mayorista/service"
import bcrypt from "bcryptjs"

// POST /store/mayoristas — registro público
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const {
    nombre, cuit, email, password, telefono,
    direccion, ciudad, provincia, rubros, zonas,
  } = req.body as any

  if (!nombre || !cuit || !email || !password) {
    return res.status(400).json({ error: "Campos requeridos: nombre, cuit, email, password" })
  }

  const mayoristaService: MayoristaModuleService = req.scope.resolve(MAYORISTA_MODULE)

  const existing = await mayoristaService.listMayoristas({ email })
  if (existing.length > 0) {
    return res.status(409).json({ error: "El email ya está registrado" })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const mayorista = await mayoristaService.createMayoristas({
    nombre,
    cuit,
    email,
    password_hash,
    telefono: telefono || null,
    direccion: direccion || null,
    ciudad: ciudad || null,
    provincia: provincia || null,
    rubros: rubros || [],
    zonas: zonas || [],
    estado: "pendiente",
  })

  const { password_hash: _, ...mayoristaSafe } = mayorista as any
  res.status(201).json({ mayorista: mayoristaSafe })
}
