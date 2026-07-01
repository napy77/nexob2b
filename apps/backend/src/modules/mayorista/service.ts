import { MedusaService } from "@medusajs/framework/utils"
import Mayorista from "./models/mayorista"
import Vendedor from "./models/vendedor"
import ListaPrecio from "./models/lista_precio"

class MayoristaModuleService extends MedusaService({
  Mayorista,
  Vendedor,
  ListaPrecio,
}) {}

export default MayoristaModuleService
