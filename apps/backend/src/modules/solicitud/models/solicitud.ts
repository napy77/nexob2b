import { model } from "@medusajs/framework/utils"

const Solicitud = model.define("solicitud", {
  id: model.id().primaryKey(),
  comercio_id: model.text(),
  mayorista_id: model.text(),
  estado: model.enum(["pendiente", "aceptado", "rechazado"]).default("pendiente"),
  mensaje: model.text().nullable(),
  vendedor_id: model.text().nullable(),     // vendedor asignado por el mayorista a este comercio
  lista_precio_id: model.text().nullable(), // lista de precios asignada a este comercio
})

export default Solicitud
