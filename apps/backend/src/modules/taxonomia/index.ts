import { Module } from "@medusajs/framework/utils"
import TaxonomiaModuleService from "./service"

export const TAXONOMIA_MODULE = "taxonomiaModuleService"

export default Module(TAXONOMIA_MODULE, { service: TaxonomiaModuleService })
