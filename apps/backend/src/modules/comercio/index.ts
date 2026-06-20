import { Module } from "@medusajs/framework/utils"
import ComercioModuleService from "./service"

export const COMERCIO_MODULE = "comercioModuleService"

export default Module(COMERCIO_MODULE, {
  service: ComercioModuleService,
})
