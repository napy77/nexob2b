import { MedusaService } from "@medusajs/framework/utils"
import Producto from "./models/producto"

class ProductoModuleService extends MedusaService({
  Producto,
}) {}

export default ProductoModuleService
