import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { RUTA_MODULE } from "../../../../../../modules/ruta"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
  } catch { return null }
}

// GET /store/mayoristas/me/rutas/:id — detalle de ruta con paradas y track
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(RUTA_MODULE)
  const ruta = await svc.retrieveRuta(req.params.id).catch(() => null)
  if (!ruta || ruta.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Ruta no encontrada" })
  }

  const [paradas, track] = await Promise.all([
    svc.listRutaParadas({ ruta_id: ruta.id }, { order: { orden: "ASC" } }),
    svc.listRutaTracks({ ruta_id: ruta.id }, { order: { timestamp: "ASC" } }),
  ])

  return res.json({ ruta: { ...ruta, paradas, track } })
}

// DELETE /store/mayoristas/me/rutas/:id — cancelar ruta
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(RUTA_MODULE)
  const ruta = await svc.retrieveRuta(req.params.id).catch(() => null)
  if (!ruta || ruta.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Ruta no encontrada" })
  }
  if (ruta.estado === "en_curso") {
    return res.status(400).json({ error: "No se puede cancelar una ruta en curso" })
  }

  await svc.updateRutas({ id: ruta.id, estado: "cancelada" })
  return res.json({ ok: true })
}
