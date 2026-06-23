import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../../modules/taxonomia"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    const { id } = req.params
    const body = req.body as any
    const { nombre, porcentaje, activo } = body || {}
    const update: any = { id }
    if (nombre !== undefined) update.nombre = nombre.trim()
    if (porcentaje !== undefined) update.porcentaje = Number(porcentaje)
    if (activo !== undefined) update.activo = activo
    const alicuota = await svc.updateAlicuotaIvas(update)
    return res.json({ alicuota })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al actualizar alícuota" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    await svc.deleteAlicuotaIvas(req.params.id)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al eliminar alícuota" })
  }
}
