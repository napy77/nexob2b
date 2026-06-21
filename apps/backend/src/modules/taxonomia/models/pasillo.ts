import { model } from "@medusajs/framework/utils"

const Pasillo = model.define("pasillo", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  activo: model.boolean().default(true),
})

export default Pasillo
