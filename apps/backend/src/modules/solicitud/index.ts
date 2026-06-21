import { Module } from "@medusajs/framework/utils"
import SolicitudModuleService from "./service"

export const SOLICITUD_MODULE = "solicitudModuleService"

export default Module(SOLICITUD_MODULE, { service: SolicitudModuleService })
