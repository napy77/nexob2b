import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
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

// GET /store/vendedores/me
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
  const vendedor = await mayoristaService.retrieveVendedor(payload.vendedor_id)
  const mayorista = await mayoristaService.retrieveMayorista(payload.mayorista_id, {
    select: ["id", "nombre", "email", "telefono", "logo_url"],
  })

  const { password_hash, ...vendedorSafe } = vendedor as any
  return res.json({ vendedor: vendedorSafe, mayorista })
}
