import { Module } from "@medusajs/framework/utils"
import ProductoMaestroModuleService from "./service"

export const PRODUCTO_MAESTRO_MODULE = "productoMaestroModuleService"

export default Module(PRODUCTO_MAESTRO_MODULE, {
  service: ProductoMaestroModuleService,
})
