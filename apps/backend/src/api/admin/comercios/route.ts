import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../modules/comercio"

// GET /admin/comercios
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  const comercios = await comercioService.listComercios(
    {},
    { order: { created_at: "DESC" } }
  )
  res.json({ comercios })
}
