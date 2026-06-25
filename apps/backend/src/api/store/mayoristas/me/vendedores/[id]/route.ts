import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MAYORISTA_MODULE } from "../../../../../../modules/mayorista"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const verify = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try { return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string } }
  catch { return null }
}

// PUT /store/mayoristas/me/vendedores/:id
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const p = verify(req)
  if (!p) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(MAYORISTA_MODULE)
  const vendedor = await svc.retrieveVendedor(req.params.id).catch(() => null)
  if (!vendedor || vendedor.mayorista_id !== p.mayorista_id) {
    return res.status(404).json({ error: "Vendedor no encontrado" })
  }

  const { nombre, apellido, email, celular, activo, password } = req.body as any
  const update: Record<string, any> = { id: req.params.id }
  if (nombre !== undefined) update.nombre = nombre.trim()
  if (apellido !== undefined) update.apellido = apellido.trim()
  if (email !== undefined) update.email = email?.trim() || null
  if (celular !== undefined) update.celular = celular?.trim() || null
  if (activo !== undefined) update.activo = activo
  if (password?.trim()) update.password_hash = await bcrypt.hash(password.trim(), 10)

  const updated = await svc.updateVendedors(update)
  return res.json({ vendedor: { ...updated, password_hash: undefined } })
}

// DELETE /store/mayoristas/me/vendedores/:id
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const p = verify(req)
  if (!p) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(MAYORISTA_MODULE)
  const vendedor = await svc.retrieveVendedor(req.params.id).catch(() => null)
  if (!vendedor || vendedor.mayorista_id !== p.mayorista_id) {
    return res.status(404).json({ error: "Vendedor no encontrado" })
  }

  await svc.deleteVendedors(req.params.id)
  return res.json({ ok: true })
}
