import { Module } from "@medusajs/framework/utils"
import ProductoListingModuleService from "./service"

export const PRODUCTO_LISTING_MODULE = "productoListingModuleService"

export default Module(PRODUCTO_LISTING_MODULE, {
  service: ProductoListingModuleService,
})
