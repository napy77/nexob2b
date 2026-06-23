import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../../modules/taxonomia"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    const { id } = req.params
    const body = req.body as any
    const { nombre, activo } = body || {}
    const update: any = { id }
    if (nombre !== undefined) update.nombre = nombre.trim()
    if (activo !== undefined) update.activo = activo
    const pasillo = await svc.updatePasillos(update)
    return res.json({ pasillo })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al actualizar pasillo" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    await svc.deletePasillos(req.params.id)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al eliminar pasillo" })
  }
}
