import { model } from "@medusajs/framework/utils"

const MayoristaMedioPago = model.define("mayorista_medio_pago", {
  id: model.id().primaryKey(),
  mayorista_id: model.text(),
  medio_pago_id: model.text(),
  habilitado: model.boolean().default(true),
})

export default MayoristaMedioPago
