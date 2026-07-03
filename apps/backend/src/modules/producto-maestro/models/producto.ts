import { model } from "@medusajs/framework/utils"

const Producto = model.define("producto_maestro", {
  id: model.id().primaryKey(),
  ean: model.text().nullable(),                          // EAN oficial o NXB-xxxxxxx generado
  nombre: model.text(),
  descripcion: model.text().nullable(),
  marca: model.text().nullable(),
  unidad_base: model.text().default("unidad"),           // "unidad", "kg", "litro", etc.
  alicuota_iva: model.number().default(21),              // 0, 10.5, 21
  pasillo_id: model.text().nullable(),
  rubro_id: model.text().nullable(),
  subrubro_id: model.text().nullable(),
  estado: model.text().default("aprobado"),              // "aprobado" | "pendiente" | "rechazado"
  imagen_url: model.text().nullable(),                   // foto del producto
  creado_por_mayorista_id: model.text().nullable(),      // si lo propuso un mayorista
})

export default Producto
