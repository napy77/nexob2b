import { MedusaService } from "@medusajs/framework/utils"
import Orden from "./models/orden"
import OrdenItem from "./models/orden_item"

class OrdenModuleService extends MedusaService({ Orden, OrdenItem }) {}

export default OrdenModuleService
