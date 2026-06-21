import { MedusaService } from "@medusajs/framework/utils"
import Solicitud from "./models/solicitud"

class SolicitudModuleService extends MedusaService({ Solicitud }) {}

export default SolicitudModuleService
