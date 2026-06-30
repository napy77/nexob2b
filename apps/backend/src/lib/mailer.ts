import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "zimbra.nubilus.com.ar",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER || "info@nexob2b.app",
    pass: process.env.SMTP_PASS || "",
  },
  tls: { rejectUnauthorized: false },
})

export interface MailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail(opts: MailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Nexo B2B" <${process.env.SMTP_USER || "info@nexob2b.app"}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
  } catch (err) {
    // Loguear pero nunca romper el flujo principal
    console.error("[mailer] Error enviando email:", err)
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

function baseLayout(contenido: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 560px; margin: 0 auto; }
    .logo { font-size: 22px; font-weight: 800; color: #1d4ed8; margin-bottom: 24px; }
    h2 { color: #111827; margin: 0 0 12px; font-size: 20px; }
    p { color: #374151; line-height: 1.6; margin: 0 0 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; }
    .tabla { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .tabla th { text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    .tabla td { padding: 8px; font-size: 14px; color: #111827; border-bottom: 1px solid #f3f4f6; }
    .total-row { font-weight: 700; font-size: 16px; color: #1d4ed8; }
    .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Nexo B2B</div>
    ${contenido}
    <div class="footer">Este es un mensaje automático de Nexo B2B — no respondas este email.</div>
  </div>
</body>
</html>`
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente:  "Pendiente",
  confirmado: "Confirmado",
  enviado:    "Enviado",
  entregado:  "Entregado",
  cancelado:  "Cancelado",
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente:  "background:#fef3c7;color:#92400e",
  confirmado: "background:#dbeafe;color:#1e40af",
  enviado:    "background:#ede9fe;color:#5b21b6",
  entregado:  "background:#d1fae5;color:#065f46",
  cancelado:  "background:#fee2e2;color:#991b1b",
}

export function mailNuevaOrdenMayorista(data: {
  mayorista_email: string
  mayorista_nombre: string
  numero: string
  comercio_nombre: string
  items: { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[]
  total: number
  notas?: string
  medio_pago_nombre?: string
  transporte_nombre?: string
}): MailOptions {
  const itemsHtml = data.items.map((i) => `
    <tr>
      <td>${i.nombre}</td>
      <td style="text-align:right">${i.cantidad} ${i.unidad}</td>
      <td style="text-align:right">$${(i.precio_unitario * i.cantidad).toLocaleString("es-AR")}</td>
    </tr>`).join("")

  return {
    to: data.mayorista_email,
    subject: `Nueva orden ${data.numero} — ${data.comercio_nombre}`,
    html: baseLayout(`
      <h2>📦 Nueva orden recibida</h2>
      <p>Recibiste un pedido de <strong>${data.comercio_nombre}</strong>.</p>
      <p><strong>N° Orden:</strong> ${data.numero}</p>
      <table class="tabla">
        <thead><tr><th>Producto</th><th style="text-align:right">Cant.</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2">Total</td>
            <td style="text-align:right">$${data.total.toLocaleString("es-AR")}</td>
          </tr>
        </tfoot>
      </table>
      ${data.medio_pago_nombre ? `<p><strong>Medio de pago:</strong> ${data.medio_pago_nombre}</p>` : ""}
      ${data.transporte_nombre ? `<p><strong>Transporte:</strong> ${data.transporte_nombre}</p>` : ""}
      ${data.notas ? `<p><strong>Notas:</strong> ${data.notas}</p>` : ""}
      <p>Ingresá al portal para confirmar o gestionar el pedido.</p>
    `),
  }
}

export function mailCambioEstadoComercio(data: {
  comercio_email: string
  numero: string
  estado: string
  mayorista_nombre: string
  total: number
  notas_mayorista?: string
}): MailOptions {
  const estadoLabel = ESTADO_LABEL[data.estado] || data.estado
  const estadoStyle = ESTADO_COLOR[data.estado] || "background:#f3f4f6;color:#374151"
  const mensajes: Record<string, string> = {
    confirmado: "Tu pedido fue <strong>confirmado</strong> por el mayorista y está siendo preparado.",
    enviado:    "Tu pedido está <strong>en camino</strong>.",
    entregado:  "Tu pedido fue marcado como <strong>entregado</strong>. ¡Gracias por tu compra!",
    cancelado:  "Tu pedido fue <strong>cancelado</strong>. Contactate con el mayorista si tenés dudas.",
  }

  return {
    to: data.comercio_email,
    subject: `Orden ${data.numero} — ${estadoLabel}`,
    html: baseLayout(`
      <h2>Actualización de tu pedido</h2>
      <p>Tu orden <strong>${data.numero}</strong> de <strong>${data.mayorista_nombre}</strong> cambió de estado:</p>
      <p><span class="badge" style="${estadoStyle}">${estadoLabel}</span></p>
      <p>${mensajes[data.estado] || `El estado de tu pedido es ahora: ${estadoLabel}.`}</p>
      <p><strong>Total:</strong> $${data.total.toLocaleString("es-AR")}</p>
      ${data.notas_mayorista ? `<p><strong>Nota del mayorista:</strong> ${data.notas_mayorista}</p>` : ""}
    `),
  }
}
