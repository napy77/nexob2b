import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import MayoristaModuleService from "../../../../modules/mayorista/service"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// POST /store/mayoristas/auth — login
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, password } = req.body as any

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" })
  }

  const mayoristaService: MayoristaModuleService = req.scope.resolve(MAYORISTA_MODULE)

  const results = await mayoristaService.listMayoristas({ email })
  const mayorista = results[0]

  if (!mayorista || !(mayorista as any).password_hash) {
    return res.status(401).json({ error: "Credenciales inválidas" })
  }

  const valid = await bcrypt.compare(password, (mayorista as any).password_hash)
  if (!valid) {
    return res.status(401).json({ error: "Credenciales inválidas" })
  }

  if (mayorista.estado === "suspendido") {
    return res.status(403).json({ error: "Cuenta suspendida. Contacte al administrador." })
  }

  const token = jwt.sign(
    {
      mayorista_id: mayorista.id,
      email: mayorista.email,
      actor_type: "mayorista",
    },
    process.env.JWT_SECRET || "nexob2b_jwt_secret_2026",
    { expiresIn: "7d" }
  )

  const { password_hash, ...mayoristaSafe } = mayorista as any
  res.json({ token, mayorista: mayoristaSafe })
}
