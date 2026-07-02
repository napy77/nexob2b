import { MedusaService } from "@medusajs/framework/utils"
import ProductoMayoristaListing from "./models/producto-mayorista-listing"
import ProductoMayoristaPresentacion from "./models/producto-mayorista-presentacion"

class ProductoListingModuleService extends MedusaService({
  ProductoMayoristaListing,
  ProductoMayoristaPresentacion,
}) {}

export default ProductoListingModuleService
