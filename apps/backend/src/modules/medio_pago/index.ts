import MedioPagoModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const MEDIO_PAGO_MODULE = "medioPagoModuleService"

export default Module(MEDIO_PAGO_MODULE, {
  service: MedioPagoModuleService,
})
