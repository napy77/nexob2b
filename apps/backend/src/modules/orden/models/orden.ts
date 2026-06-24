import { model } from "@medusajs/framework/utils"

const Orden = model.define("orden", {
  id: model.id().primaryKey(),
  numero: model.text(),                          // "ORD-00042" — referencia legible
  comercio_id: model.text(),
  mayorista_id: model.text(),
  estado: model.text().default("pendiente"),      // pendiente|confirmado|enviado|entregado|cancelado
  vendedor_id: model.text().nullable(),
  notas: model.text().nullable(),
  total_neto: model.number().default(0),
  total_iva: model.number().default(0),
  total: model.number().default(0),
})

export default Orden
