import { model } from "@medusajs/framework/utils"

const ProductoMayoristaPresentacion = model.define("producto_mayorista_presentacion", {
  id: model.id().primaryKey(),
  listing_id: model.text(),                        // → producto_mayorista_listing.id
  presentacion_id: model.text(),                   // → producto_presentacion.id
  precio: model.number(),                          // precio de venta de ESTA presentación
  precio_lista: model.number().nullable(),         // precio de referencia tachado (opcional)
  stock: model.number().default(0),
  activo: model.boolean().default(true),
})

export default ProductoMayoristaPresentacion
