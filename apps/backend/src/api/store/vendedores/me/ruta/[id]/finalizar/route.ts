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

// PUT /store/vendedores/me/ruta/:id/finalizar
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(RUTA_MODULE)
  const ruta = await svc.retrieveRuta(req.params.id).catch(() => null)
  if (!ruta || ruta.vendedor_id !== payload.vendedor_id) {
    return res.status(404).json({ error: "Ruta no encontrada" })
  }
  if (ruta.estado !== "en_curso") {
    return res.status(400).json({ error: "La ruta no está en curso" })
  }

  const updated = await svc.updateRutas({
    id: ruta.id,
    estado: "completada",
    hora_fin: new Date().toISOString(),
  })

  return res.json({ ruta: updated })
}
