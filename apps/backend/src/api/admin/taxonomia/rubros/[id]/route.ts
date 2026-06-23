import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../../modules/taxonomia"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    const { id } = req.params
    const body = req.body as any
    const nombre = body?.nombre
    const activo = body?.activo
    const update: any = { id }
    if (nombre !== undefined) update.nombre = nombre.trim()
    if (activo !== undefined) update.activo = activo
    const rubro = await svc.updateRubros(update)
    return res.json({ rubro })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al actualizar rubro" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    await svc.deleteRubros(req.params.id)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al eliminar rubro" })
  }
}
