/**
 * Capa central de notificaciones.
 * Llama a email + push en paralelo, sin bloquear el flujo principal.
 */
import {
  sendMail,
  mailNuevaOrdenMayorista,
  mailCambioEstadoComercio,
} from "./mailer"
import { sendPush } from "./push"

// ─── Nueva orden creada ───────────────────────────────────────────────────────

export async function notificarNuevaOrden(data: {
  // Mayorista (recibe la notif)
  mayorista_email: string
  mayorista_nombre: string
  mayorista_push_token?: string | null
  // Orden
  numero: string
  comercio_nombre: string
  items: { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[]
  total: number
  notas?: string
  medio_pago_nombre?: string
  transporte_nombre?: string
}): Promise<void> {
  await Promise.allSettled([
    // Email al mayorista
    sendMail(mailNuevaOrdenMayorista(data)),

    // Push al mayorista (si tiene token)
    data.mayorista_push_token
      ? sendPush({
          to: data.mayorista_push_token,
          title: `Nueva orden — ${data.comercio_nombre}`,
          body: `${data.numero} · $${data.total.toLocaleString("es-AR")}`,
          data: { tipo: "nueva_orden", numero: data.numero },
        })
      : Promise.resolve(),
  ])
}

// ─── Estado de orden cambió ───────────────────────────────────────────────────

export async function notificarCambioEstado(data: {
  // Comercio (recibe la notif)
  comercio_email: string
  comercio_push_token?: string | null
  // Vendedor (también recibe push si existe)
  vendedor_push_token?: string | null
  // Orden
  numero: string
  estado: string
  mayorista_nombre: string
  total: number
  notas_mayorista?: string
}): Promise<void> {
  const ESTADO_PUSH: Record<string, { title: string; body: string }> = {
    confirmado:    { title: "Pedido confirmado ✅",   body: `${data.numero} fue confirmado por ${data.mayorista_nombre}` },
    armando:       { title: "Pedido en preparación 📦", body: `${data.mayorista_nombre} está armando tu pedido ${data.numero}` },
    listo:         { title: "Pedido listo 🟢",        body: `Tu pedido de ${data.mayorista_nombre} está listo` },
    en_transporte: { title: "Pedido en camino 🚚",    body: `${data.numero} está en camino` },
    enviado:       { title: "Pedido en camino 🚚",    body: `${data.numero} está en camino` },
    entregado:     { title: "Pedido entregado ✔️",    body: `${data.numero} fue entregado` },
    cancelado:     { title: "Pedido cancelado ❌",    body: `${data.numero} fue cancelado` },
    devuelto:      { title: "Pedido devuelto ↩️",     body: `${data.numero}: ${data.notas_mayorista || "revisá el mensaje del mayorista"}` },
  }

  const pushMsg = ESTADO_PUSH[data.estado]
  const pushTokens = [data.comercio_push_token, data.vendedor_push_token].filter(Boolean) as string[]

  await Promise.allSettled([
    // Email al comercio
    sendMail(mailCambioEstadoComercio(data)),

    // Push al comercio y al vendedor (si tienen token)
    pushMsg && pushTokens.length > 0
      ? sendPush({
          to: pushTokens,
          title: pushMsg.title,
          body: pushMsg.body,
          data: { tipo: "cambio_estado", numero: data.numero, estado: data.estado },
        })
      : Promise.resolve(),
  ])
}
