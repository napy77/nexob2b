import { model } from "@medusajs/framework/utils"

const Ruta = model.define("ruta", {
  id: model.id().primaryKey(),
  mayorista_id: model.text(),
  vendedor_id: model.text(),
  nombre: model.text(),
  fecha: model.text(), // ISO date string YYYY-MM-DD
  estado: model.enum(["pendiente", "en_curso", "completada", "cancelada"]).default("pendiente"),
  hora_inicio: model.text().nullable(),
  hora_fin: model.text().nullable(),
  notas: model.text().nullable(),
})

export default Ruta
