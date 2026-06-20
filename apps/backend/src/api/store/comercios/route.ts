import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../modules/comercio"
import ComercioModuleService from "../../../modules/comercio/service"
import bcrypt from "bcryptjs"

// POST /store/comercios — registro público
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { nombre, cuit, email, password, telefono, direccion, ciudad, provincia, rubros } = req.body as any

  if (!nombre || !cuit || !email || !password) {
    return res.status(400).json({ error: "Campos requeridos: nombre, cuit, email, password" })
  }

  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)

  const existing = await comercioService.listComercios({ email })
  if (existing.length > 0) {
    return res.status(409).json({ error: "El email ya está registrado" })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const comercio = await comercioService.createComercios({
    nombre,
    cuit,
    email,
    password_hash,
    telefono: telefono || null,
    direccion: direccion || null,
    ciudad: ciudad || null,
    provincia: provincia || null,
    rubros: rubros || [],
    estado: "pendiente",
  })

  const { password_hash: _, ...comercioSafe } = comercio as any
  res.status(201).json({ comercio: comercioSafe })
}
