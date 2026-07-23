import { model } from "@medusajs/framework/utils"

// Reglas de despacho NexoFlex
// El motor evalúa las reglas en orden ascendente y aplica la primera que matchea.
// condicion:
//   'siempre'           → fallback / default (debe ser la última en orden)
//   'misma_ciudad'      → comercio y mayorista en la misma ciudad
//   'misma_provincia'   → mismo provincia, distinta ciudad
//   'distancia_km_lte'  → distancia ≤ condicion_valor km  (requiere lat/lng en mayorista y comercio)
//   'distancia_km_gt'   → distancia > condicion_valor km

const NexoflexRegla = model.define("nexoflex_regla", {
  id: model.id().primaryKey(),
  orden: model.number().default(0),
  nombre: model.text(),                         // "Misma ciudad → Cabify"
  condicion: model.text(),                      // ver arriba
  condicion_valor: model.number().nullable(),   // km (solo para distancia_km_*)
  transporte_id: model.text(),                  // ID del transporte a usar
  activo: model.boolean().default(true),
})

export default NexoflexRegla
