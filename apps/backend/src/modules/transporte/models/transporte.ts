import { model } from "@medusajs/framework/utils"

const Transporte = model.define("transporte", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  tipo: model.enum(["retiro", "envio_propio", "correo", "flete", "moto"]).default("envio_propio"),
  descripcion: model.text().nullable(),
  icono: model.text().nullable(),       // emoji o URL
  activo: model.boolean().default(true),
  orden: model.number().default(0),
  porcentaje_costo: model.number().default(0), // % sobre el total del pedido
})

export default Transporte
