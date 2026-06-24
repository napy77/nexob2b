import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import jwt from "jsonwebtoken"

function verifyVendedor(req: MedusaRequest): { vendedor_id: string; mayorista_id: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const payload = jwt.verify(
      auth.split(" ")[1],
      process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
    ) as any
    if (payload.rol !== "vendedor") return null
    return { vendedor_id: payload.vendedor_id, mayorista_id: payload.mayorista_id }
  } catch {
    return null
  }
}

// PUT /store/vendedores/me/ubicacion — actualiza la posición GPS del vendedor
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { lat, lng } = req.body as any

  if (lat == null || lng == null) {
    return res.status(400).json({ error: "lat y lng requeridos" })
  }

  const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
  await mayoristaService.updateVendedors({
    id: payload.vendedor_id,
    lat,
    lng,
    ultima_ubicacion: new Date(),
  })

  return res.json({ ok: true })
}
