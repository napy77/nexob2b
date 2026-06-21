import { MedusaService } from "@medusajs/framework/utils"
import Rubro from "./models/rubro"
import Subrubro from "./models/subrubro"
import Pasillo from "./models/pasillo"

class TaxonomiaModuleService extends MedusaService({ Rubro, Subrubro, Pasillo }) {}

export default TaxonomiaModuleService
