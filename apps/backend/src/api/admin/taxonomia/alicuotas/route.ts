import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../modules/taxonomia"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    const alicuotas = await svc.listAlicuotaIvas({}, { order: { porcentaje: "ASC" } })
    return res.json({ alicuotas })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al listar alícuotas" })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    const { nombre, porcentaje } = req.body as any
    if (!nombre?.trim()) return res.status(400).json({ error: "nombre requerido" })
    if (porcentaje === undefined || porcentaje === null) return res.status(400).json({ error: "porcentaje requerido" })
    const alicuota = await svc.createAlicuotaIvas({
      nombre: nombre.trim(),
      porcentaje: Number(porcentaje),
      activo: true,
    })
    return res.json({ alicuota })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al crear alícuota" })
  }
}
