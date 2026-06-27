import { model } from "@medusajs/framework/utils"

const MayoristaTransporte = model.define("mayorista_transporte", {
  id: model.id().primaryKey(),
  mayorista_id: model.text(),
  transporte_id: model.text(),
  habilitado: model.boolean().default(true),
  porcentaje_costo: model.number().default(0), // override del % global
})

export default MayoristaTransporte
