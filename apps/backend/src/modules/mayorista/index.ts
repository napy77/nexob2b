import { Module } from "@medusajs/framework/utils"
import MayoristaModuleService from "./service"

export const MAYORISTA_MODULE = "mayoristaModuleService"

export default Module(MAYORISTA_MODULE, {
  service: MayoristaModuleService,
})
