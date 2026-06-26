import { model } from "@medusajs/framework/utils"

const MedioPago = model.define("medio_pago", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  tipo: model.enum(["efectivo", "cheque", "transferencia", "tarjeta", "online"]).default("efectivo"),
  descripcion: model.text().nullable(),
  icono: model.text().nullable(),        // emoji o URL
  activo: model.boolean().default(true),
  orden: model.number().default(0),
  integracion: model.text().nullable(),  // "mercadopago" | "talo" | null
  config: model.text().nullable(),       // JSON stringificado con API keys etc
})

export default MedioPago
