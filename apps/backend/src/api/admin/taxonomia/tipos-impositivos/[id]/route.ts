import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { TAXONOMIA_MODULE } from "../../../../../modules/taxonomia"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    const { id } = req.params
    const body = req.body as any
    const { nombre, descripcion, precio_con_impuestos, activo } = body || {}
    const update: any = { id }
    if (nombre !== undefined) update.nombre = nombre.trim()
    if (descripcion !== undefined) update.descripcion = descripcion?.trim() || null
    if (precio_con_impuestos !== undefined) update.precio_con_impuestos = precio_con_impuestos
    if (activo !== undefined) update.activo = activo
    const tipo = await svc.updateTipoImpositivos(update)
    return res.json({ tipo })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al actualizar tipo impositivo" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: any = req.scope.resolve(TAXONOMIA_MODULE)
    await svc.deleteTipoImpositivos(req.params.id)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Error al eliminar tipo impositivo" })
  }
}
