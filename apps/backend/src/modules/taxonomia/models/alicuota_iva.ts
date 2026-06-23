import { model } from "@medusajs/framework/utils"

const AlicuotaIva = model.define("alicuota_iva", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  porcentaje: model.number(),
  activo: model.boolean().default(true),
})

export default AlicuotaIva
