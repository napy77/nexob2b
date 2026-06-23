import { model } from "@medusajs/framework/utils"

const TipoImpositivo = model.define("tipo_impositivo", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  descripcion: model.text().nullable(),
  precio_con_impuestos: model.boolean().default(true),
  activo: model.boolean().default(true),
})

export default TipoImpositivo
