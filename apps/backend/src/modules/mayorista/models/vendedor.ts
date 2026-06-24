import { model } from "@medusajs/framework/utils"

const Vendedor = model.define("vendedor", {
  id: model.id().primaryKey(),
  mayorista_id: model.text(),
  nombre: model.text(),
  apellido: model.text(),
  email: model.text().nullable(),
  celular: model.text().nullable(),
  activo: model.boolean().default(true),
})

export default Vendedor
