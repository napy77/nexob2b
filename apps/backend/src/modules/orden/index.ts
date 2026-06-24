import OrdenModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ORDEN_MODULE = "ordenModuleService"

export default Module(ORDEN_MODULE, {
  service: OrdenModuleService,
})
