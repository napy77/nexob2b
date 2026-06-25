import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { RUTA_MODULE } from "../../../../../../../../modules/ruta"

const verifyVendedor = (req: MedusaRequest): { vendedor_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { vendedor_id: string }
  } catch { return null }
}

// PUT /store/vendedores/me/ruta/:id/paradas/:paradaId
// body: { accion: "visitar" | "omitir", notas?: string }
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyVendedor(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { accion, notas } = req.body as any
  if (!["visitar", "omitir"].includes(accion)) {
    return res.status(400).json({ error: "accion debe ser 'visitar' u 'omitir'" })
  }

  const svc: any = req.scope.resolve(RUTA_MODULE)

  const ruta = await svc.retrieveRuta(req.params.id).catch(() => null)
  if (!ruta || ruta.vendedor_id !== payload.vendedor_id) {
    return res.status(404).json({ error: "Ruta no encontrada" })
  }
  if (ruta.estado !== "en_curso") {
    return res.status(400).json({ error: "La ruta no está en curso" })
  }

  const parada = await svc.retrieveRutaParada(req.params.paradaId).catch(() => null)
  if (!parada || parada.ruta_id !== ruta.id) {
    return res.status(404).json({ error: "Parada no encontrada" })
  }

  const now = new Date().toISOString()
  const updateData: Record<string, any> = {
    id: parada.id,
    estado: accion === "visitar" ? "visitado" : "omitido",
    notas: notas || parada.notas,
  }

  if (accion === "visitar") {
    if (!parada.hora_llegada) updateData.hora_llegada = now
    updateData.hora_salida = now
  }

  const updated = await svc.updateRutaParadas(updateData)
  return res.json({ parada: updated })
}
