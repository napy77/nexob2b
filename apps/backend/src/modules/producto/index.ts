import { Module } from "@medusajs/framework/utils"
import ProductoModuleService from "./service"

export const PRODUCTO_MODULE = "productoModuleService"

export default Module(PRODUCTO_MODULE, {
  service: ProductoModuleService,
})
