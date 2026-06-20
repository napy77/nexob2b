import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../modules/mayorista"
import MayoristaModuleService from "../../../modules/mayorista/service"

// GET /admin/mayoristas
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mayoristaService: MayoristaModuleService =
    req.scope.resolve(MAYORISTA_MODULE)

  const [mayoristas, count] = await mayoristaService.listAndCountMayoristas(
    {},
    { order: { created_at: "DESC" } }
  )

  res.json({ mayoristas, count })
}

// POST /admin/mayoristas
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const mayoristaService: MayoristaModuleService =
    req.scope.resolve(MAYORISTA_MODULE)

  const mayorista = await mayoristaService.createMayoristas(req.body as any)

  res.status(201).json({ mayorista })
}
