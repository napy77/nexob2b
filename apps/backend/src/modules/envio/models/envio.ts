import { model } from "@medusajs/framework/utils"

const Envio = model.define("envio", {
  id: model.id().primaryKey(),
  orden_id: model.text(),
  mayorista_id: model.text(),
  transporte_id: model.text().nullable(),
  transporte_nombre: model.text().nullable(),
  numero_guia: model.text().nullable(),
  token_publico: model.text(),              // UUID único para URL pública del QR
  tiene_seguimiento_propio: model.boolean().default(false),
  tracking_url: model.text().nullable(),    // URL completa ya con numero_guia interpolado
  // Datos del destinatario (snapshot al momento del despacho)
  destinatario_nombre: model.text().nullable(),
  destinatario_email: model.text().nullable(),
  destinatario_telefono: model.text().nullable(),
  destinatario_direccion: model.text().nullable(),
  // Estado del envío
  estado: model.text().default("pendiente"),  // pendiente | en_camino | visita_fallida | entregado | rechazado
  // Historial de eventos como JSONB
  eventos: model.json().default([] as unknown as Record<string, unknown>),
  // Datos del bulto (copiados de la orden)
  cantidad_bultos: model.number().nullable(),
  peso_kg: model.number().nullable(),
  dimensiones: model.text().nullable(),
  // Orden de referencia
  orden_numero: model.text().nullable(),
})

export default Envio
