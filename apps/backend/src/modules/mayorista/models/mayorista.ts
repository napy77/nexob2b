import { model } from "@medusajs/framework/utils"

const Mayorista = model.define("mayorista", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  cuit: model.text(),
  email: model.text(),
  password_hash: model.text().nullable(),
  telefono: model.text().nullable(),
  direccion: model.text().nullable(),
  ciudad: model.text().nullable(),
  provincia: model.text().nullable(),
  rubros: model.json(),
  zonas: model.json().nullable(),
  estado: model.enum(["pendiente", "aprobado", "suspendido"]).default("pendiente"),
})

export default Mayorista
