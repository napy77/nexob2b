import OrdenModuleService from "./service"
import { Module } from "@medusajs/framework/utils"
import { Migration20260624200001 } from "./migrations/Migration20260624200001"

export const ORDEN_MODULE = "ordenModuleService"

export default Module(ORDEN_MODULE, {
  service: OrdenModuleService,
  migrations: [Migration20260624200001],
})
