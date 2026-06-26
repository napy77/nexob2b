import { MedusaService } from "@medusajs/framework/utils"
import MedioPago from "./models/medio_pago"
import MayoristaMedioPago from "./models/mayorista_medio_pago"

class MedioPagoModuleService extends MedusaService({ MedioPago, MayoristaMedioPago }) {}

export default MedioPagoModuleService
