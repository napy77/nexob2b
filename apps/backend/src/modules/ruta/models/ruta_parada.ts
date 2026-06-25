import { model } from "@medusajs/framework/utils"

const RutaParada = model.define("ruta_parada", {
  id: model.id().primaryKey(),
  ruta_id: model.text(),
  comercio_id: model.text(),
  comercio_nombre: model.text(),
  comercio_direccion: model.text().nullable(),
  comercio_lat: model.number().nullable(),
  comercio_lng: model.number().nullable(),
  orden: model.number(), // posición en la ruta: 1, 2, 3...
  estado: model.enum(["pendiente", "visitado", "omitido"]).default("pendiente"),
  hora_llegada: model.text().nullable(),
  hora_salida: model.text().nullable(),
  notas: model.text().nullable(),
})

export default RutaParada
