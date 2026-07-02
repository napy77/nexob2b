import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_MAESTRO_MODULE } from "../../../../../modules/producto-maestro"
import { PRODUCTO_LISTING_MODULE } from "../../../../../modules/producto-listing"

// PUT /admin/productos/:id/aprobar
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const svcMaestro: any = req.scope.resolve(PRODUCTO_MAESTRO_MODULE)
  const svcListing: any = req.scope.resolve(PRODUCTO_LISTING_MODULE)
  const { id } = req.params

  await svcMaestro.updateProductos({ id }, { estado: "aprobado" })

  // Aprobar también el listing del mayorista que lo propuso
  await svcListing.updateProductoMayoristaListings(
    { producto_id: id },
    { aprobado: true }
  )

  res.json({ success: true })
}
