import { MedusaService } from "@medusajs/framework/utils"
import Mayorista from "./models/mayorista"
import Vendedor from "./models/vendedor"

class MayoristaModuleService extends MedusaService({
  Mayorista,
  Vendedor,
}) {}

export default MayoristaModuleService
