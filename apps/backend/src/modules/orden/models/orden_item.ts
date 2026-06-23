import { model } from "@medusajs/framework/utils"

const OrdenItem = model.define("orden_item", {
  id: model.id().primaryKey(),
  orden_id: model.text(),
  producto_id: model.text(),
  nombre: model.text(),                 // snapshot al momento del pedido
  precio_unitario: model.number(),      // precio neto snapshot
  alicuota_iva: model.number().default(21),
  cantidad: model.number(),
  unidad: model.text(),
  subtotal_neto: model.number(),
  subtotal_iva: model.number(),
  subtotal: model.number(),
})

export default OrdenItem
