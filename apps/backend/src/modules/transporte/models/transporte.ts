import { model } from "@medusajs/framework/utils"

const Transporte = model.define("transporte", {
  id: model.id().primaryKey(),
  nombre: model.text(),
  tipo: model.enum(["retiro", "envio_propio", "correo", "flete", "moto"]).default("envio_propio"),
  descripcion: model.text().nullable(),
  icono: model.text().nullable(),
  activo: model.boolean().default(true),
  orden: model.number().default(0),
  porcentaje_costo: model.number().default(0),
  // Logística / integración
  tiene_seguimiento_propio: model.boolean().default(false),
  tracking_url_template: model.text().nullable(), // ej: https://oca.com.ar/seguimiento?numero={numero_guia}
  integracion_tipo: model.text().nullable(),      // "oca" | "andreani" | "custom" | null
  integracion_config: model.json().nullable(),    // { cuit, usuario, password, ... }
})

export default Transporte
