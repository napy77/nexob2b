import { model } from "@medusajs/framework/utils"

const RutaTrack = model.define("ruta_track", {
  id: model.id().primaryKey(),
  ruta_id: model.text(),
  lat: model.number(),
  lng: model.number(),
  timestamp: model.text(), // ISO datetime
})

export default RutaTrack
