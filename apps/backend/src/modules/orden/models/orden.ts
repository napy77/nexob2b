import { model } from "@medusajs/framework/utils"

const Orden = model.define("orden", {
  id: model.id().primaryKey(),
  numero: model.text(),                          // "ORD-00042" — referencia legible
  comercio_id: model.text(),
  mayorista_id: model.text(),
  estado: model.text().default("cargada"),          // cargada|confirmado|armando|listo|en_transporte|entregado|cancelado|devuelto
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
  // Flags de trazabilidad (independientes del estado principal)
  is_pagada: model.boolean().default(false),
  is_facturada: model.boolean().default(false),
  // Datos de armado (estado "listo")
  cantidad_bultos: model.number().nullable(),
  peso_kg: model.number().nullable(),
  dimensiones: model.text().nullable(),
  // Datos de despacho (estado "en_transporte")
  numero_guia: model.text().nullable(),
})

export default Orden
