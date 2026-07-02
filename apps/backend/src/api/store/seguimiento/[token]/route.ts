/**
 * GET  /store/seguimiento/:token  — datos públicos del envío (sin auth)
 * POST /store/seguimiento/:token  — el transportista actualiza el estado (sin auth)
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ENVIO_MODULE } from "../../../../modules/envio"
import { getPool } from "../../../../lib/db-seq"

const ESTADOS_VALIDOS = ["en_camino", "visita_fallida", "entregado", "rechazado"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { token } = req.params
  const { rows } = await getPool().query(
    `SELECT * FROM envio WHERE token_publico = $1 AND deleted_at IS NULL LIMIT 1`,
    [token]
  )
  if (rows.length === 0) return res.status(404).json({ error: "Envío no encontrado" })
  const envio = rows[0]

  return res.json({
    envio: {
      id: envio.id,
      orden_numero: envio.orden_numero,
      transporte_nombre: envio.transporte_nombre,
      numero_guia: envio.numero_guia,
      tiene_seguimiento_propio: envio.tiene_seguimiento_propio,
      tracking_url: envio.tiene_seguimiento_propio ? envio.tracking_url : null,
      estado: envio.estado,
      eventos: envio.eventos || [],
      destinatario_nombre: envio.destinatario_nombre,
      destinatario_direccion: envio.destinatario_direccion,
      cantidad_bultos: envio.cantidad_bultos,
      peso_kg: envio.peso_kg,
      dimensiones: envio.dimensiones,
      created_at: envio.created_at,
    },
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { token } = req.params
  const { estado, notas } = req.body as { estado: string; notas?: string }

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(", ")}` })
  }

  const { rows } = await getPool().query(
    `SELECT * FROM envio WHERE token_publico = $1 AND deleted_at IS NULL LIMIT 1`,
    [token]
  )
  if (rows.length === 0) return res.status(404).json({ error: "Envío no encontrado" })

  const envio = rows[0]

  // Si ya está entregado o rechazado, no permite más cambios
  if (["entregado", "rechazado"].includes(envio.estado)) {
    return res.status(400).json({ error: `El envío ya fue marcado como "${envio.estado}"` })
  }

  const nuevoEvento = {
    timestamp: new Date().toISOString(),
    estado,
    notas: notas?.trim() || null,
  }
  const eventosActualizados = [...(envio.eventos || []), nuevoEvento]

  await getPool().query(
    `UPDATE envio SET estado = $1, eventos = $2, updated_at = NOW() WHERE id = $3`,
    [estado, JSON.stringify(eventosActualizados), envio.id]
  )

  // Si se entregó, actualizar la orden a "entregado" también
  if (estado === "entregado") {
    try {
      await getPool().query(
        `UPDATE orden SET estado = 'entregado', updated_at = NOW() WHERE id = $1 AND estado = 'en_transporte'`,
        [envio.orden_id]
      )
    } catch {}
  }

  return res.json({ ok: true, estado, eventos: eventosActualizados })
}
