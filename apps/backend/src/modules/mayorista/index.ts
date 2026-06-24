import { Module } from "@medusajs/framework/utils"
import MayoristaModuleService from "./service"
import { Migration20260624200000 } from "./migrations/Migration20260624200000"

export const MAYORISTA_MODULE = "mayoristaModuleService"

export default Module(MAYORISTA_MODULE, {
  service: MayoristaModuleService,
  migrations: [Migration20260624200000],
})
