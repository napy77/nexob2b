import { model } from "@medusajs/framework/utils"

const ProductoMayoristaListing = model.define("producto_mayorista_listing", {
  id: model.id().primaryKey(),
  producto_id: model.text(),
  mayorista_id: model.text(),
  descripcion_propia: model.text().nullable(),     // texto adicional del mayorista
  notas: model.text().nullable(),                  // notas internas
  tiempo_entrega_dias: model.number().nullable(),
  activo: model.boolean().default(true),
  aprobado: model.boolean().default(true),         // false si el producto maestro está pendiente
})

export default ProductoMayoristaListing
