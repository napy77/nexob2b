import { MedusaService } from "@medusajs/framework/utils"
import Producto from "./models/producto"
import ProductoPresentacion from "./models/producto-presentacion"

class ProductoMaestroModuleService extends MedusaService({
  Producto,
  ProductoPresentacion,
}) {}

export default ProductoMaestroModuleService
