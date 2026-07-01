import { model } from "@medusajs/framework/utils"

const ListaPrecio = model.define("lista_precio", {
  id: model.id().primaryKey(),
  mayorista_id: model.text(),
  nombre: model.text(),
  descuento_porcentaje: model.number().default(0),
})

export default ListaPrecio
