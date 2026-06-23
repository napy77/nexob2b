import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../../modules/taxonomia"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    const { id } = req.params
    const body = req.body as any
    const { nombre, activo, rubro_id } = body || {}
    const update: any = { id }
    if (nombre !== undefined) update.nombre = nombre.trim()
    if (activo !== undefined) update.activo = activo
    if (rubro_id !== undefined) update.rubro_id = rubro_id
    const subrubro = await svc.updateSubrubros(update)
    return res.json({ subrubro })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al actualizar subrubro" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    await svc.deleteSubrubros(req.params.id)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al eliminar subrubro" })
  }
}
