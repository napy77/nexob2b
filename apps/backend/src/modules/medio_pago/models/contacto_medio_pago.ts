import { model } from "@medusajs/framework/utils"

const ContactoMedioPago = model.define("contacto_medio_pago", {
  id: model.id().primaryKey(),
  mayorista_id: model.text(),
  comercio_id: model.text(),
  medio_pago_id: model.text(),
  habilitado: model.boolean().default(true),
})

export default ContactoMedioPago
