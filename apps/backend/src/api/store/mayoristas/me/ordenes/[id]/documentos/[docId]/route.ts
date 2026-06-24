import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../../../../modules/orden"
import jwt from "jsonwebtoken"
import fs from "fs"
import path from "path"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { mayorista_id: string }
  } catch { return null }
}

// DELETE /store/mayoristas/me/ordenes/:id/documentos/:docId
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { docId } = req.params
  const svc: any = req.scope.resolve(ORDEN_MODULE)

  const doc = await svc.retrieveOrdenDocumento(docId).catch(() => null)
  if (!doc || doc.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Documento no encontrado" })
  }

  // Borrar archivo físico
  try {
    const filePath = path.join(process.cwd(), ".medusa", "server", "public", doc.url)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {}

  await svc.deleteOrdenDocumentos(docId)
  return res.json({ ok: true })
}
