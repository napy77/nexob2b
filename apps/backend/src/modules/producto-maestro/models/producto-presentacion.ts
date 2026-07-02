import { model } from "@medusajs/framework/utils"

const ProductoPresentacion = model.define("producto_maestro_presentacion", {
  id: model.id().primaryKey(),
  producto_id: model.text(),
  nombre: model.text(),                                     // "Unidad", "Pack x12", "Caja x120", "Pallet"
  factor: model.number().default(1),                        // cantidad de unidad_base que contiene
  unidades_nivel_anterior: model.number().nullable(),       // cuántos del nivel inferior componen este (display: 12 cajitas)
  ean_propio: model.text().nullable(),                      // el pack/caja puede tener su propio EAN
  peso_g: model.number().nullable(),                        // peso total de esta presentación en gramos
  largo_mm: model.number().nullable(),
  ancho_mm: model.number().nullable(),
  alto_mm: model.number().nullable(),
  orden: model.number().default(0),                         // para ordenar: 0=unidad, 1=pack, 2=caja, 3=pallet
})

export default ProductoPresentacion
