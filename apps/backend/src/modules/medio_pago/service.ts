import { MedusaService } from "@medusajs/framework/utils"
import MedioPago from "./models/medio_pago"
import MayoristaMedioPago from "./models/mayorista_medio_pago"
import ContactoMedioPago from "./models/contacto_medio_pago"

class MedioPagoModuleService extends MedusaService({ MedioPago, MayoristaMedioPago, ContactoMedioPago }) {}

export default MedioPagoModuleService
