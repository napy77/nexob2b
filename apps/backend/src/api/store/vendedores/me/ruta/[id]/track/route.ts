import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { RUTA_MODULE } from "../../../../../../../modules/ruta"

const verifyVendedor = (req: MedusaRequest): { vendedor_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { vendedor_id: string }
  } catch { return null }
}

// POST /store/vendedores/me/ruta/:id/track — registrar punto GPS
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { lat, lng } = req.body as any
  if (!lat || !lng) return res.status(400).json({ error: "lat y lng requeridos" })

  const svc: any = req.scope.resolve(RUTA_MODULE)
  const ruta = await svc.retrieveRuta(req.params.id).catch(() => null)
  if (!ruta || ruta.vendedor_id !== payload.vendedor_id || ruta.estado !== "en_curso") {
    return res.status(404).json({ error: "Ruta en curso no encontrada" })
  }

  await svc.createRutaTracks({
    ruta_id: ruta.id,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    timestamp: new Date().toISOString(),
  })

  return res.json({ ok: true })
}
