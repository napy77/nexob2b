import EnvioModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ENVIO_MODULE = "envioModuleService"

export default Module(ENVIO_MODULE, {
  service: EnvioModuleService,
})
