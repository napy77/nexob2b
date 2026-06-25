import RutaModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const RUTA_MODULE = "rutaModuleService"

export default Module(RUTA_MODULE, {
  service: RutaModuleService,
})
