import { MedusaService } from "@medusajs/framework/utils"
import Ruta from "./models/ruta"
import RutaParada from "./models/ruta_parada"
import RutaTrack from "./models/ruta_track"

class RutaModuleService extends MedusaService({ Ruta, RutaParada, RutaTrack }) {}

export default RutaModuleService
