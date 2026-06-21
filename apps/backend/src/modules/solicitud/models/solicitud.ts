import { model } from "@medusajs/framework/utils"

const Solicitud = model.define("solicitud", {
  id: model.id().primaryKey(),
  comercio_id: model.text(),
  mayorista_id: model.text(),
  estado: model.enum(["pendiente", "aceptado", "rechazado"]).default("pendiente"),
  mensaje: model.text().nullable(),
})

export default Solicitud
