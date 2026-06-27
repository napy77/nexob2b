import { MedusaService } from "@medusajs/framework/utils"
import Transporte from "./models/transporte"
import MayoristaTransporte from "./models/mayorista_transporte"

class TransporteModuleService extends MedusaService({ Transporte, MayoristaTransporte }) {}

export default TransporteModuleService
