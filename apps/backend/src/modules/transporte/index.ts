import TransporteModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const TRANSPORTE_MODULE = "transporteModuleService"

export default Module(TRANSPORTE_MODULE, {
  service: TransporteModuleService,
})
