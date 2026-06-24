import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import jwt from "jsonwebtoken"

const verify = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try { return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { mayorista_id: string } }
  catch { return null }
}

// GET /store/mayoristas/me/vendedores
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const p = verify(req)
  if (!p) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(MAYORISTA_MODULE)
  const vendedores = await svc.listVendedors(
    { mayorista_id: p.mayorista_id },
    { order: { apellido: "ASC", nombre: "ASC" } }
  )
  return res.json({ vendedores })
}

// POST /store/mayoristas/me/vendedores
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const p = verify(req)
  if (!p) return res.status(401).json({ error: "No autorizado" })

  const { nombre, apellido, email, celular } = req.body as any
  if (!nombre?.trim() || !apellido?.trim()) {
    return res.status(400).json({ error: "Nombre y apellido son obligatorios" })
  }

  const svc: any = req.scope.resolve(MAYORISTA_MODULE)
  const vendedor = await svc.createVendedors({
    mayorista_id: p.mayorista_id,
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    email: email?.trim() || null,
    celular: celular?.trim() || null,
    activo: true,
  })
  return res.status(201).json({ vendedor })
}
