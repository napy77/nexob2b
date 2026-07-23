import { MedusaService } from "@medusajs/framework/utils"
import Transporte from "./models/transporte"
import MayoristaTransporte from "./models/mayorista_transporte"
import NexoflexRegla from "./models/nexoflex_regla"

class TransporteModuleService extends MedusaService({ Transporte, MayoristaTransporte, NexoflexRegla }) {}

export default TransporteModuleService
