import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_MAESTRO_MODULE } from "../../../../../modules/producto-maestro"

// PUT /admin/productos/:id/rechazar
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const { id } = req.params
  await svc.updateProductos({ id }, { estado: "rechazado" })
  res.json({ success: true })
}
