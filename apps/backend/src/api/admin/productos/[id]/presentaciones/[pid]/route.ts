import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_MAESTRO_MODULE } from "../../../../../../modules/producto-maestro"

// PUT /admin/productos/:id/presentaciones/:pid
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const { pid } = req.params
  const body = req.body as any

  const updates: Record<string, any> = {}
  const campos = ["nombre", "factor", "unidades_nivel_anterior", "ean_propio", "peso_g", "largo_mm", "ancho_mm", "alto_mm", "orden"]
  for (const c of campos) {
    if (body[c] !== undefined) updates[c] = body[c] === "" ? null : body[c]
  }

  const presentacion = await svc.updateProductoPresentacions({ id: pid }, updates)
  res.json({ presentacion })
}

// DELETE /admin/productos/:id/presentaciones/:pid
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  await svc.deleteProductoPresentacions(req.params.pid)
  res.json({ success: true })
}
