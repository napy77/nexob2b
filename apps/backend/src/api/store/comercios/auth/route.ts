import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../../modules/comercio"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// POST /store/comercios/auth — login
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, password } = req.body as any

  if (!email || !password) {
    return res.status(400).json({ error: "Email y password requeridos" })
  }

  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  const [comercio] = await comercioService.listComercios({ email })

  if (!comercio) {
    return res.status(401).json({ error: "Credenciales incorrectas" })
  }

  const valid = await bcrypt.compare(password, comercio.password_hash)
  if (!valid) {
    return res.status(401).json({ error: "Credenciales incorrectas" })
  }

  if (comercio.estado === "suspendido") {
    return res.status(403).json({ error: "Tu cuenta está suspendida" })
  }

  const token = jwt.sign(
    { comercio_id: comercio.id },
    process.env.JWT_SECRET || "nexob2b_jwt_secret_2026",
    { expiresIn: "30d" }
  )

  const { password_hash, ...comercioSafe } = comercio as any
  res.json({ token, comercio: comercioSafe })
}
