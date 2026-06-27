import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { TRANSPORTE_MODULE } from "../../../../../modules/transporte"

// GET /store/mayoristas/:id/transportes
// Devuelve los transportes habilitados por este mayorista (para el carrito del comercio)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "No autorizado" })

  try {
    jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
  } catch {
    return res.status(401).json({ error: "Token inválido" })
  }

  const mayorista_id = req.params.id
  const svc: any = req.scope.resolve(TRANSPORTE_MODULE)

  const [globales, configurados] = await Promise.all([
    svc.listTransportes({ activo: true }, { order: { orden: "ASC" } }),
    svc.listMayoristaTransportes({ mayorista_id }),
  ])

  const configMap = new Map<string, any>(configurados.map((c: any) => [c.transporte_id, c]))

  const transportes = globales
    .filter((t: any) => {
      const config = configMap.get(t.id)
      // Solo muestra los que el mayorista habilitó explícitamente
      return config ? config.habilitado : false
    })
    .map((t: any) => {
      const config = configMap.get(t.id)
      return {
        id: t.id,
        nombre: t.nombre,
        tipo: t.tipo,
        icono: t.icono,
        descripcion: t.descripcion,
        porcentaje_costo: config && config.porcentaje_costo != null
          ? parseFloat(String(config.porcentaje_costo))
          : parseFloat(String(t.porcentaje_costo)) || 0,
      }
    })

  return res.json({ transportes })
}
