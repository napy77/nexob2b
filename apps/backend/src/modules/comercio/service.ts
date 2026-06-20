import { MedusaService } from "@medusajs/framework/utils"
import Comercio from "./models/comercio"

class ComercioModuleService extends MedusaService({
  Comercio,
}) {}

export default ComercioModuleService
