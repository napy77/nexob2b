import { MedusaService } from "@medusajs/framework/utils"
import MedioPago from "./models/medio_pago"

class MedioPagoModuleService extends MedusaService({ MedioPago }) {}

export default MedioPagoModuleService
