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
  medio_pago_id: model.text().nullable(),
  medio_pago_nombre: model.text().nullable(),
  porcentaje_costo_mp: model.number().default(0),
  costo_medio_pago: model.number().default(0),
  transporte_id: model.text().nullable(),
  transporte_nombre: model.text().nullable(),
  porcentaje_costo_transporte: model.number().default(0),
  costo_transporte: model.number().default(0),
  mensaje_mayorista: model.text().nullable(),
  codigo_descuento_id: model.text().nullable(),
  monto_descuento: model.number().default(0),
  mp_preference_id: model.text().nullable(),
  mp_pago_id: model.text().nullable(),
  mp_estado_pago: model.text().nullable(),
})

export default Orden
