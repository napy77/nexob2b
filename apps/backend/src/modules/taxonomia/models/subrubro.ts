import { model } from "@medusajs/framework/utils"

const Subrubro = model.define("subrubro", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  rubro_id: model.text(),
  activo: model.boolean().default(true),
})

export default Subrubro
