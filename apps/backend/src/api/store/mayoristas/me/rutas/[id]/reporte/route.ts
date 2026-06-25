import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { RUTA_MODULE } from "../../../../../../../modules/ruta"
import { ORDEN_MODULE } from "../../../../../../../modules/orden"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET!) as { mayorista_id: string }
  } catch { return null }
}

// GET /store/mayoristas/me/rutas/:id/reporte
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(RUTA_MODULE)
  const ordenSvc: any = req.scope.resolve(ORDEN_MODULE)

  const ruta = await svc.retrieveRuta(req.params.id).catch(() => null)
  if (!ruta || ruta.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Ruta no encontrada" })
  }

  const [paradas, track] = await Promise.all([
    svc.listRutaParadas({ ruta_id: ruta.id }, { order: { orden: "ASC" } }),
    svc.listRutaTracks({ ruta_id: ruta.id }, { order: { timestamp: "ASC" } }),
  ])

  // Órdenes generadas por este vendedor en el día de la ruta
  const ordenes = await ordenSvc.listOrdenes(
    { vendedor_id: ruta.vendedor_id },
    {}
  ).catch(() => [] as any[])

  const ordenesDelDia = ordenes.filter((o: any) => {
    const fechaOrden = new Date(o.created_at).toISOString().slice(0, 10)
    return fechaOrden === ruta.fecha
  })

  const totalOrdenes = ordenesDelDia.length
  const totalMonto = ordenesDelDia.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0)

  const paradasVisitadas = paradas.filter((p: any) => p.estado === "visitado").length
  const paradasOmitidas = paradas.filter((p: any) => p.estado === "omitido").length

  // Calcular duración
  let duracionMinutos: number | null = null
  if (ruta.hora_inicio && ruta.hora_fin) {
    const inicio = new Date(ruta.hora_inicio).getTime()
    const fin = new Date(ruta.hora_fin).getTime()
    duracionMinutos = Math.round((fin - inicio) / 60000)
  }

  return res.json({
    reporte: {
      ruta,
      paradas,
      track,
      resumen: {
        total_paradas: paradas.length,
        visitadas: paradasVisitadas,
        omitidas: paradasOmitidas,
        pendientes: paradas.length - paradasVisitadas - paradasOmitidas,
        total_ordenes: totalOrdenes,
        total_monto: totalMonto,
        duracion_minutos: duracionMinutos,
      },
      ordenes: ordenesDelDia,
    }
  })
}
