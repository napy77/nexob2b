import { model } from "@medusajs/framework/utils"

const Rubro = model.define("rubro", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  pasillo_id: model.text().nullable(),
  activo: model.boolean().default(true),
})

export default Rubro
