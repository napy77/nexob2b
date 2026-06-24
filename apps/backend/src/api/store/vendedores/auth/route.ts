import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// POST /store/vendedores/auth — login del vendedor
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, password } = req.body as any

  if (!email || !password) {
    return res.status(400).json({ error: "Email y password requeridos" })
  }

  const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
  const vendedores = await mayoristaService.listVendedors({ email, activo: true })
  const vendedor = vendedores[0]

  if (!vendedor) {
    return res.status(401).json({ error: "Credenciales incorrectas" })
  }

  if (!vendedor.password_hash) {
    return res.status(401).json({ error: "Cuenta no activada. Solicitá tu contraseña al mayorista." })
  }

  const valid = await bcrypt.compare(password, vendedor.password_hash)
  if (!valid) {
    return res.status(401).json({ error: "Credenciales incorrectas" })
  }

  const token = jwt.sign(
    {
      vendedor_id: vendedor.id,
      mayorista_id: vendedor.mayorista_id,
      rol: "vendedor",
    },
    process.env.JWT_SECRET || "nexob2b_jwt_secret_2026",
    { expiresIn: "30d" }
  )

  return res.json({
    token,
    vendedor: {
      id: vendedor.id,
      nombre: vendedor.nombre,
      apellido: vendedor.apellido,
      email: vendedor.email,
      celular: vendedor.celular,
      mayorista_id: vendedor.mayorista_id,
    },
    rol: "vendedor",
  })
}
