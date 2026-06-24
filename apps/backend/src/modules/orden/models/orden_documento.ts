import { model } from "@medusajs/framework/utils"

const OrdenDocumento = model.define("orden_documento", {
  id: model.id().primaryKey(),
  orden_id: model.text(),
  mayorista_id: model.text(),
  nombre: model.text(),
  tipo: model.text().default("otro"),  // remito | factura | recibo | otro
  url: model.text(),
})

export default OrdenDocumento
