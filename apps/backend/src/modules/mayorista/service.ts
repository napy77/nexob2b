import { MedusaService } from "@medusajs/framework/utils"
import Mayorista from "./models/mayorista"

class MayoristaModuleService extends MedusaService({
  Mayorista,
}) {}

export default MayoristaModuleService
