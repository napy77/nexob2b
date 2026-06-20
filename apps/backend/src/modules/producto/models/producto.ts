import { model } from "@medusajs/framework/utils"

const Producto = model.define("producto", {
  id: model.id().primaryKey(),
  mayorista_id: model.text(),
  nombre: model.text(),
  descripcion: model.text().nullable(),
  precio: model.number(),
  unidad: model.text(),
  compra_minima: model.number().default(1),
  stock: model.number().nullable(),
  sku: model.text().nullable(),
  ean: model.text().nullable(),
  imagen_url: model.text().nullable(),
  rubro: model.text().nullable(),
  pasillo: model.text().nullable(),
  activo: model.boolean().default(true),
})

export default Producto
