import { MedusaService } from "@medusajs/framework/utils"
import Rubro from "./models/rubro"
import Subrubro from "./models/subrubro"
import Pasillo from "./models/pasillo"
import TipoImpositivo from "./models/tipo_impositivo"

class TaxonomiaModuleService extends MedusaService({ Rubro, Subrubro, Pasillo, TipoImpositivo }) {}

export default TaxonomiaModuleService
