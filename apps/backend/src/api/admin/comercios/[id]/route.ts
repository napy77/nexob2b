import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../../modules/comercio"

// GET /admin/comercios/:id
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  const comercio = await comercioService.retrieveComercio(req.params.id)
  res.json({ comercio })
}

// PUT /admin/comercios/:id
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  const comercio = await comercioService.updateComercios({
    id: req.params.id,
    ...(req.body as any),
  })
  res.json({ comercio })
}

// DELETE /admin/comercios/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  await comercioService.deleteComercios(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
