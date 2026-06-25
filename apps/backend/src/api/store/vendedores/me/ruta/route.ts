import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { RUTA_MODULE } from "../../../../../modules/ruta"

const verifyVendedor = (req: MedusaRequest): { vendedor_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { vendedor_id: string }
  } catch { return null }
}

// GET /store/vendedores/me/ruta — ruta activa del vendedor (pendiente o en_curso)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(RUTA_MODULE)

  // Buscar ruta en_curso primero, luego pendiente de hoy
  let rutas = await svc.listRutas(
    { vendedor_id: payload.vendedor_id, estado: "en_curso" },
    { order: { created_at: "DESC" }, take: 1 }
  )

  if (!rutas.length) {
    const hoy = new Date().toISOString().slice(0, 10)
    rutas = await svc.listRutas(
      { vendedor_id: payload.vendedor_id, estado: "pendiente", fecha: hoy },
      { order: { created_at: "DESC" }, take: 1 }
    )
  }

  if (!rutas.length) return res.json({ ruta: null })

  const ruta = rutas[0]
  const paradas = await svc.listRutaParadas({ ruta_id: ruta.id }, { order: { orden: "ASC" } })

  return res.json({ ruta: { ...ruta, paradas } })
}
