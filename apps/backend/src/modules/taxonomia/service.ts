import { MedusaService } from "@medusajs/framework/utils"
import Rubro from "./models/rubro"
import Subrubro from "./models/subrubro"
import Pasillo from "./models/pasillo"
import TipoImpositivo from "./models/tipo_impositivo"
import AlicuotaIva from "./models/alicuota_iva"

class TaxonomiaModuleService extends MedusaService({ Rubro, Subrubro, Pasillo, TipoImpositivo, AlicuotaIva }) {}

export default TaxonomiaModuleService
