import { model } from "@medusajs/framework/utils"

const Vendedor = model.define("vendedor", {
  id: model.id().primaryKey(),
  mayorista_id: model.text(),
  nombre: model.text(),
  apellido: model.text(),
  email: model.text().nullable(),
  celular: model.text().nullable(),
  activo: model.boolean().default(true),
  password_hash: model.text().nullable(),
  lat: model.number().nullable(),
  lng: model.number().nullable(),
  ultima_ubicacion: model.dateTime().nullable(),
  push_token: model.text().nullable(),
})

export default Vendedor
