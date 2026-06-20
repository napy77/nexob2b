import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import MayoristaModuleService from "../../../../modules/mayorista/service"

// GET /admin/mayoristas/:id
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mayoristaService: MayoristaModuleService =
    req.scope.resolve(MAYORISTA_MODULE)

  const mayorista = await mayoristaService.retrieveMayorista(req.params.id)
  res.json({ mayorista })
}

// PUT /admin/mayoristas/:id
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const mayoristaService: MayoristaModuleService =
    req.scope.resolve(MAYORISTA_MODULE)

  const mayorista = await mayoristaService.updateMayoristas({
    id: req.params.id,
    ...(req.body as any),
  })

  res.json({ mayorista })
}

// DELETE /admin/mayoristas/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const mayoristaService: MayoristaModuleService =
    req.scope.resolve(MAYORISTA_MODULE)

  await mayoristaService.deleteMayoristas(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
