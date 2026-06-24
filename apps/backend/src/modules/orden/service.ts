import { MedusaService } from "@medusajs/framework/utils"
import Orden from "./models/orden"
import OrdenItem from "./models/orden_item"
import OrdenDocumento from "./models/orden_documento"

class OrdenModuleService extends MedusaService({ Orden, OrdenItem, OrdenDocumento }) {}

export default OrdenModuleService
