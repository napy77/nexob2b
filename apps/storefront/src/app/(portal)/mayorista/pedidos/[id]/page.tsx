"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const ESTADO_LABEL: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  cargada:       { label: "Cargada",    color: "#92400e", bg: "#fef3c7", emoji: "📥" },
  confirmado:    { label: "Confirmado", color: "#1e40af", bg: "#dbeafe", emoji: "✅" },
  armando:       { label: "Armando",    color: "#6d28d9", bg: "#ede9fe", emoji: "📦" },
  listo:         { label: "Listo",      color: "#065f46", bg: "#d1fae5", emoji: "🟢" },
  en_transporte: { label: "En camino",  color: "#1e3a8a", bg: "#dbeafe", emoji: "🚚" },
  entregado:     { label: "Entregado",  color: "#064e3b", bg: "#d1fae5", emoji: "✔️" },
  cancelado:     { label: "Cancelado",  color: "#991b1b", bg: "#fee2e2", emoji: "✖️" },
  devuelto:      { label: "Devuelta",   color: "#92400e", bg: "#ffedd5", emoji: "↩️" },
  pendiente:     { label: "Cargada",    color: "#92400e", bg: "#fef3c7", emoji: "📥" },
  enviado:       { label: "En camino",  color: "#1e3a8a", bg: "#dbeafe", emoji: "🚚" },
}

const TIPO_DOC_LABEL: Record<string, string> = {
  remito: "Remito", factura: "Factura", recibo: "Recibo",
  comprobante_pago: "Comprobante de pago", otro: "Otro",
}

type OrdenItem = {
  id: string; nombre: string; sku?: string | null; ean?: string | null
  cantidad: number; unidad: string; precio_unitario: number
  alicuota_iva: number; subtotal_neto: number; subtotal_iva: number; subtotal: number
}

type Orden = {
  id: string; numero: string; comercio_id: string; estado: string
  notas?: string; total_neto: number; total_iva: number; total: number
  medio_pago_nombre?: string | null; porcentaje_costo_mp?: number; costo_medio_pago?: number
  transporte_nombre?: string | null; porcentaje_costo_transporte?: number; costo_transporte?: number
  mensaje_mayorista?: string | null; created_at: string; items: OrdenItem[]
  is_pagada?: boolean; is_facturada?: boolean
  cantidad_bultos?: number | null; peso_kg?: number | null; dimensiones?: string | null
  numero_guia?: string | null
  comercio?: { nombre: string; email: string; telefono?: string; cuit?: string; condicion_fiscal?: string }
}

type Documento = { id: string; nombre: string; tipo: string; url: string; created_at: string }
type Mayorista = {
  id: string; nombre: string; cuit: string; email: string
  telefono?: string; direccion?: string; ciudad?: string; provincia?: string; logo_url?: string
}
type Envio = {
  id: string; token_publico: string; tiene_seguimiento_propio: boolean
  tracking_url: string | null; seguimiento_url: string | null; estado: string
}

export default function PedidoDetalleMayoristaPage() {
  const router = useRouter()
  const params = useParams()
  const [orden, setOrden] = useState<Orden | null>(null)
  const [mayorista, setMayorista] = useState<Mayorista | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [envio, setEnvio] = useState<Envio | null>(null)
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(false)
  const [despachando, setDespachando] = useState(false)
  const [error, setError] = useState("")
  const [sinStock, setSinStock] = useState<string[]>([])

  // Modales
  const [showDevolver, setShowDevolver] = useState(false)
  const [mensajeDevolucion, setMensajeDevolucion] = useState("")
  const [showListo, setShowListo] = useState(false)
  const [bultos, setBultos] = useState("")
  const [pesoKg, setPesoKg] = useState("")
  const [dimensiones, setDimensiones] = useState("")
  const [showTransporte, setShowTransporte] = useState(false)
  const [numeroGuia, setNumeroGuia] = useState("")

  // Upload
  const [uploadNombre, setUploadNombre] = useState("")
  const [uploadTipo, setUploadTipo] = useState("remito")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = () => localStorage.getItem("mayorista_token") || ""

  const cargar = async () => {
    const t = token()
    if (!t) { router.replace("/mayorista/login"); return }
    try {
      const [resOrden, resMayorista] = await Promise.all([
        fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}`, {
          headers: { "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
        }),
        fetch(`${BACKEND_URL}/store/mayoristas/me`, {
          headers: { "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
        }),
      ])
      const dataOrden = await resOrden.json()
      const dataMayorista = await resMayorista.json()
      if (!resOrden.ok) throw new Error(dataOrden.error)
      setOrden(dataOrden.orden)
      setMayorista(dataMayorista.mayorista)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const cargarDocumentos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}/documentos`, {
        headers: { "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      setDocumentos(data.documentos || [])
    } catch {}
  }

  const despacharYObtenerEnvio = async () => {
    setDespachando(true); setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}/despachar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEnvio(data)
      return data as Envio & { seguimiento_url: string | null }
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setDespachando(false)
    }
  }

  const imprimirEtiqueta = async () => {
    let envioData = envio
    if (!envioData) {
      envioData = await despacharYObtenerEnvio() as any
      if (!envioData) return
    }
    const seguimientoUrl = (envioData as any).seguimiento_url || `${BACKEND_URL}/seguimiento/${(envioData as any).token_publico}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(seguimientoUrl)}`

    const win = window.open("", "_blank")
    if (!win) { alert("Habilitá los pop-ups para imprimir la etiqueta."); return }
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Etiqueta ${orden?.numero}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #fff; }
          .etiqueta {
            width: 10cm; min-height: 15cm; border: 2px solid #000;
            margin: 1cm auto; padding: 0.6cm; display: flex;
            flex-direction: column; gap: 0.4cm;
          }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #000; padding-bottom: 0.4cm; }
          .remitente h3 { font-size: 13px; font-weight: 900; }
          .remitente p { font-size: 10px; color: #444; }
          .orden-num { font-size: 20px; font-weight: 900; text-align: right; }
          .seccion-titulo { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #666; letter-spacing: 0.5px; margin-bottom: 2px; }
          .destinatario h2 { font-size: 15px; font-weight: 900; }
          .destinatario p { font-size: 11px; color: #333; }
          .bultos { font-size: 13px; font-weight: 700; background: #f0f0f0; padding: 6px 10px; border-radius: 6px; }
          .qr-section { border-top: 1.5px dashed #000; padding-top: 0.4cm; display: flex; gap: 0.4cm; align-items: center; }
          .qr-section img { width: 3.5cm; height: 3.5cm; border: 1px solid #ddd; }
          .qr-info { flex: 1; }
          .qr-info p { font-size: 9px; color: #555; line-height: 1.4; }
          .qr-info .url { font-size: 8px; font-family: monospace; color: #333; word-break: break-all; margin-top: 4px; }
          .footer { font-size: 8px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 4px; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="etiqueta">
          <div class="header">
            <div class="remitente">
              <h3>${mayorista?.nombre || "Remitente"}</h3>
              ${mayorista?.direccion ? `<p>${mayorista.direccion}</p>` : ""}
              ${mayorista?.ciudad || mayorista?.provincia ? `<p>${[mayorista.ciudad, mayorista.provincia].filter(Boolean).join(", ")}</p>` : ""}
            </div>
            <div class="orden-num">${orden?.numero || ""}</div>
          </div>
          <div class="destinatario">
            <p class="seccion-titulo">Destinatario</p>
            <h2>${orden?.comercio?.nombre || "Destinatario"}</h2>
            ${orden?.comercio?.cuit ? `<p>CUIT: ${orden.comercio.cuit}</p>` : ""}
            ${orden?.comercio?.telefono ? `<p>Tel: ${orden.comercio.telefono}</p>` : ""}
            ${orden?.comercio?.email ? `<p>${orden.comercio.email}</p>` : ""}
          </div>
          ${orden?.cantidad_bultos ? `
          <div class="bultos">
            📦 ${orden.cantidad_bultos} bulto${orden.cantidad_bultos !== 1 ? "s" : ""}
            ${orden?.peso_kg ? ` · ${orden.peso_kg} kg` : ""}
            ${orden?.dimensiones ? ` · ${orden.dimensiones}` : ""}
          </div>` : ""}
          ${orden?.transporte_nombre ? `<p style="font-size:11px;color:#555;">🚚 ${orden.transporte_nombre}${orden?.numero_guia ? ` — Guía: ${orden.numero_guia}` : ""}</p>` : ""}
          <div class="qr-section">
            <img src="${qrUrl}" alt="QR Seguimiento" onload="window.print()"/>
            <div class="qr-info">
              <p class="seccion-titulo">Seguimiento del envío</p>
              <p>Escaneá el QR para ver el estado del paquete o actualizar la entrega.</p>
              <p class="url">${seguimientoUrl}</p>
            </div>
          </div>
          <div class="footer">Nexo B2B · Plataforma mayorista · ${new Date().toLocaleDateString("es-AR")}</div>
        </div>
      </body>
      </html>
    `)
    win.document.close()
  }

  useEffect(() => { cargar(); cargarDocumentos() }, [params.id])

  const cambiarEstado = async (siguiente: string, extra?: Record<string, any>) => {
    setAccionando(true); setError(""); setSinStock([])
    try {
      const body: any = { estado: siguiente, ...extra }
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.detalle) setSinStock(data.detalle)
        throw new Error(data.error)
      }
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAccionando(false)
    }
  }

  const marcarFlag = async (flag: "marcar-facturada" | "marcar-pagada") => {
    setAccionando(true); setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}/${flag}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY },
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAccionando(false)
    }
  }

  const enviarDevolucion = async () => {
    if (!mensajeDevolucion.trim()) { setError("Escribí un mensaje para el comercio."); return }
    setShowDevolver(false)
    await cambiarEstado("devuelto", { mensaje_mayorista: mensajeDevolucion.trim() })
    setMensajeDevolucion("")
  }

  const confirmarListo = async () => {
    if (!bultos || Number(bultos) < 1) { setError("Indicá la cantidad de bultos."); return }
    setShowListo(false)
    await cambiarEstado("listo", {
      cantidad_bultos: Number(bultos),
      peso_kg: pesoKg ? Number(pesoKg) : null,
      dimensiones: dimensiones.trim() || null,
    })
    setBultos(""); setPesoKg(""); setDimensiones("")
  }

  const confirmarTransporte = async () => {
    setShowTransporte(false)
    await cambiarEstado("en_transporte", { numero_guia: numeroGuia.trim() || null })
    setNumeroGuia("")
  }

  const subirDocumento = async () => {
    if (!uploadFile || !uploadNombre.trim()) { setUploadError("Completá el nombre y seleccioná un archivo."); return }
    setUploading(true); setUploadError("")
    try {
      const b64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(uploadFile)
      })
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY },
        body: JSON.stringify({ nombre: uploadNombre.trim(), tipo: uploadTipo, archivo_base64: b64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUploadNombre(""); setUploadTipo("remito"); setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await cargarDocumentos()
      await cargar() // refresca flags is_facturada / is_pagada
    } catch (e: any) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const eliminarDocumento = async (docId: string) => {
    if (!confirm("¿Eliminar este documento?")) return
    await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}/documentos/${docId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token()}`, "x-publishable-api-key": PUB_KEY },
    })
    await cargarDocumentos()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando pedido...</p>
    </div>
  )
  if (!orden) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error || "Pedido no encontrado"}</p>
    </div>
  )

  const estadoKey = orden.estado === "pendiente" ? "cargada" : orden.estado === "enviado" ? "en_transporte" : orden.estado
  const estado = ESTADO_LABEL[estadoKey] || { label: estadoKey, color: "#374151", bg: "#f3f4f6", emoji: "📋" }
  const fechaFormateada = new Date(orden.created_at).toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  })

  const Modal = ({ show, title, onClose, children }: { show: boolean; title: string; onClose: () => void; children: React.ReactNode }) => !show ? null : (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )

  return (
    <>
      <style>{`@media print { body * { visibility: hidden !important; } #orden-print, #orden-print * { visibility: visible !important; } #orden-print { position: fixed; top: 0; left: 0; width: 100%; } @page { margin: 15mm; size: A4; } }`}</style>

      {/* Hoja impresión */}
      <div id="orden-print" className="hidden print:block bg-white p-0 text-sm text-gray-900">
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
          <div className="flex items-center gap-4">
            {mayorista?.logo_url && <img src={`${BACKEND_URL}${mayorista.logo_url}`} alt="Logo" className="h-14 w-auto object-contain" />}
            <div>
              <h1 className="text-xl font-bold">{mayorista?.nombre}</h1>
              {mayorista?.cuit && <p className="text-xs text-gray-500">CUIT: {mayorista.cuit}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold">ORDEN DE VENTA</h2>
            <p className="text-lg font-semibold text-blue-700">{orden.numero}</p>
            <p className="text-xs text-gray-500">{fechaFormateada}</p>
          </div>
        </div>
        {orden.comercio && (
          <div className="mb-5">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Cliente</p>
            <p className="font-semibold">{orden.comercio.nombre}</p>
            {orden.comercio.cuit && <p className="text-xs text-gray-500">CUIT: {orden.comercio.cuit}</p>}
          </div>
        )}
        <table className="w-full text-xs mb-5" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1e3a5f", color: "white" }}>
              <th className="px-2 py-2 text-left">Descripción</th>
              <th className="px-2 py-2 text-center">Cant.</th>
              <th className="px-2 py-2 text-left">Unidad</th>
              <th className="px-2 py-2 text-right">P. Neto</th>
              <th className="px-2 py-2 text-center">IVA %</th>
              <th className="px-2 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {orden.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                <td className="px-2 py-1.5 font-medium">{item.nombre}</td>
                <td className="px-2 py-1.5 text-center">{item.cantidad}</td>
                <td className="px-2 py-1.5">{item.unidad}</td>
                <td className="px-2 py-1.5 text-right">${item.precio_unitario.toLocaleString("es-AR")}</td>
                <td className="px-2 py-1.5 text-center">{item.alicuota_iva}%</td>
                <td className="px-2 py-1.5 text-right font-semibold">${item.subtotal.toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end">
          <div className="w-56 text-xs space-y-1">
            <div className="flex justify-between text-gray-600"><span>Subtotal neto</span><span>${orden.total_neto.toLocaleString("es-AR")}</span></div>
            <div className="flex justify-between text-gray-600"><span>IVA</span><span>${orden.total_iva.toLocaleString("es-AR")}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>${orden.total.toLocaleString("es-AR")}</span></div>
          </div>
        </div>
      </div>

      {/* Vista normal */}
      <div className="print:hidden min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => router.push("/mayorista/pedidos")} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-bold text-gray-900">{orden.numero}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: estado.color, background: estado.bg }}>
                {estado.emoji} {estado.label}
              </span>
              {orden.is_facturada && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">🧾 Facturada</span>}
              {orden.is_pagada && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">💰 Pagada</span>}
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir OV
            </button>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-6 py-8 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

          {sinStock.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold text-orange-800 mb-1">⚠️ Stock insuficiente:</p>
              <ul className="list-disc list-inside space-y-0.5">{sinStock.map((s, i) => <li key={i} className="text-orange-700 text-xs">{s}</li>)}</ul>
            </div>
          )}

          {/* ── ACCIONES SEGÚN ESTADO ── */}

          {(orden.estado === "cargada" || orden.estado === "pendiente") && (
            <div className="space-y-2">
              <button onClick={() => cambiarEstado("confirmado")} disabled={accionando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                {accionando ? "Procesando..." : "✅ Confirmar pedido"}
              </button>
              <button onClick={() => { setSinStock([]); setError(""); setShowDevolver(true) }} disabled={accionando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 disabled:opacity-60">
                ↩️ Devolver con mensaje
              </button>
              <button onClick={() => { if (confirm("¿Cancelar este pedido?")) cambiarEstado("cancelado") }} disabled={accionando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-60">
                ✖ Cancelar pedido
              </button>
            </div>
          )}

          {orden.estado === "confirmado" && (
            <div className="space-y-2">
              <button onClick={() => cambiarEstado("armando")} disabled={accionando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60">
                {accionando ? "Procesando..." : "📦 Iniciar armado"}
              </button>
              {!orden.is_facturada && (
                <button onClick={() => { if (confirm("¿Cancelar este pedido? Se restaurará el stock.")) cambiarEstado("cancelado") }} disabled={accionando}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-60">
                  ✖ Cancelar pedido
                </button>
              )}
            </div>
          )}

          {orden.estado === "armando" && (
            <div className="space-y-2">
              <button onClick={() => setShowListo(true)} disabled={accionando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
                {accionando ? "Procesando..." : "🟢 Marcar como listo"}
              </button>
            </div>
          )}

          {orden.estado === "listo" && (
            <div className="space-y-2">
              {orden.cantidad_bultos && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-800">
                  <p className="font-semibold">📦 {orden.cantidad_bultos} bulto{orden.cantidad_bultos !== 1 ? "s" : ""}</p>
                  {orden.peso_kg && <p className="text-xs text-green-700">{orden.peso_kg} kg</p>}
                  {orden.dimensiones && <p className="text-xs text-green-700">{orden.dimensiones}</p>}
                </div>
              )}
              <button onClick={() => setShowTransporte(true)} disabled={accionando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60">
                {accionando ? "Procesando..." : "🚚 Marcar como en camino"}
              </button>
              <button onClick={() => { if (confirm("¿Marcar como entregado? (retiro en local)")) cambiarEstado("entregado") }} disabled={accionando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                {accionando ? "Procesando..." : "✔️ Entregado (retiro en local)"}
              </button>
            </div>
          )}

          {(orden.estado === "en_transporte" || orden.estado === "enviado") && (
            <div className="space-y-2">
              {orden.numero_guia && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
                  <p className="text-xs text-blue-600 font-medium">Número de guía / seguimiento</p>
                  <p className="font-mono font-semibold text-blue-900">{orden.numero_guia}</p>
                </div>
              )}
              <button onClick={imprimirEtiqueta} disabled={despachando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 flex items-center justify-center gap-2">
                {despachando ? "Generando..." : "🏷️ Imprimir etiqueta con QR"}
              </button>
              <button onClick={() => { if (confirm("¿Confirmar entrega?")) cambiarEstado("entregado") }} disabled={accionando}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                {accionando ? "Procesando..." : "✔️ Confirmar entrega"}
              </button>
            </div>
          )}

          {/* ── FLAGS DE TRAZABILIDAD (siempre visibles si la orden no está cancelada/devuelta) ── */}
          {!["cancelado", "devuelto"].includes(orden.estado) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">💼 Trazabilidad</h3>
              <div className="space-y-2">
                {/* Facturada */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${orden.is_facturada ? "bg-indigo-500" : "bg-gray-200"}`} />
                    <span className="text-sm text-gray-700">🧾 Factura emitida</span>
                  </div>
                  {!orden.is_facturada ? (
                    <button onClick={() => marcarFlag("marcar-facturada")} disabled={accionando}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-medium disabled:opacity-60">
                      Marcar como facturada
                    </button>
                  ) : (
                    <span className="text-xs text-indigo-600 font-medium">✓ Facturada</span>
                  )}
                </div>
                {/* Pagada */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${orden.is_pagada ? "bg-green-500" : "bg-gray-200"}`} />
                    <span className="text-sm text-gray-700">💰 Pago recibido</span>
                  </div>
                  {!orden.is_pagada ? (
                    <button onClick={() => marcarFlag("marcar-pagada")} disabled={accionando}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-medium disabled:opacity-60">
                      Marcar como pagada
                    </button>
                  ) : (
                    <span className="text-xs text-green-600 font-medium">✓ Pagada</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Devuelta con aviso si ya tiene factura */}
          {orden.estado === "devuelto" && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold text-orange-800 mb-1">↩️ Pedido devuelto</p>
              {orden.mensaje_mayorista && <p className="text-orange-700 italic">"{orden.mensaje_mayorista}"</p>}
              {orden.is_facturada && (
                <p className="text-xs text-orange-600 mt-2">⚠️ Este pedido tiene factura emitida — coordiná la resolución económica con el comercio.</p>
              )}
            </div>
          )}

          {/* Info del comercio */}
          {orden.comercio && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Comercio</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-900">{orden.comercio.nombre}</p>
                {orden.comercio.condicion_fiscal && <p className="text-xs text-gray-500">{orden.comercio.condicion_fiscal}</p>}
                {orden.comercio.cuit && <p className="text-xs text-gray-500">CUIT: {orden.comercio.cuit}</p>}
                {orden.comercio.email && <a href={`mailto:${orden.comercio.email}`} className="text-xs text-blue-600 block">{orden.comercio.email}</a>}
                {orden.comercio.telefono && <a href={`tel:${orden.comercio.telefono}`} className="text-xs text-blue-600 block">{orden.comercio.telefono}</a>}
              </div>
            </div>
          )}

          {/* Detalle del pedido */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Productos solicitados</h3>
              <span className="text-xs text-gray-400">{fechaFormateada}</span>
            </div>
            <div className="space-y-3">
              {orden.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.nombre}</p>
                    <p className="text-xs text-gray-400">{item.cantidad} {item.unidad} × ${item.precio_unitario.toLocaleString("es-AR")} neto + IVA {item.alicuota_iva}%</p>
                    {(item.sku || item.ean) && (
                      <p className="text-xs text-gray-300 mt-0.5">
                        {item.sku ? `SKU: ${item.sku}` : ""}{item.sku && item.ean ? "  ·  " : ""}{item.ean ? `EAN: ${item.ean}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900 flex-shrink-0 ml-4">${item.subtotal.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal neto</span><span>${orden.total_neto.toLocaleString("es-AR")}</span></div>
              <div className="flex justify-between text-gray-500"><span>IVA</span><span>${orden.total_iva.toLocaleString("es-AR")}</span></div>
              {orden.medio_pago_nombre && <div className="flex justify-between text-gray-500"><span>Medio de pago</span><span className="font-medium">{orden.medio_pago_nombre}</span></div>}
              {Number(orden.costo_medio_pago) > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Costo método ({orden.porcentaje_costo_mp}%)</span>
                  <span className="font-semibold">+${Number(orden.costo_medio_pago).toLocaleString("es-AR")}</span>
                </div>
              )}
              {orden.transporte_nombre && <div className="flex justify-between text-gray-500"><span>Transporte</span><span className="font-medium">{orden.transporte_nombre}</span></div>}
              {Number(orden.costo_transporte) > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Costo transporte ({orden.porcentaje_costo_transporte}%)</span>
                  <span className="font-semibold">+${Number(orden.costo_transporte).toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-1 mt-1">
                <span>Total</span><span>${orden.total.toLocaleString("es-AR")}</span>
              </div>
            </div>
            {orden.notas && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs font-medium text-amber-800 mb-1">Notas del comercio:</p>
                <p className="text-xs text-amber-700 italic">{orden.notas}</p>
              </div>
            )}
          </div>

          {/* Documentos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">📎 Documentación adjunta</h3>
            {documentos.length > 0 ? (
              <div className="space-y-2 mb-5">
                {documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg flex-shrink-0">
                        {doc.tipo === "factura" ? "🧾" : doc.tipo === "remito" ? "📋" : doc.tipo === "recibo" ? "💳" : doc.tipo === "comprobante_pago" ? "💸" : "📄"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre}</p>
                        <p className="text-xs text-gray-400">
                          {TIPO_DOC_LABEL[doc.tipo] || doc.tipo} · {new Date(doc.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <a href={`${BACKEND_URL}${doc.url}`} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50">Ver</a>
                      <button onClick={() => eliminarDocumento(doc.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">No hay documentos adjuntos aún.</p>
            )}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-medium text-gray-600">Adjuntar documento</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nombre del doc. ej: Factura A 001-00012"
                  value={uploadNombre} onChange={(e) => setUploadNombre(e.target.value)}
                  className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={uploadTipo} onChange={(e) => setUploadTipo(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="remito">Remito</option>
                  <option value="factura">Factura</option>
                  <option value="recibo">Recibo</option>
                  <option value="otro">Otro</option>
                </select>
                <label className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-blue-300 truncate">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate text-gray-500">{uploadFile ? uploadFile.name : "Seleccionar archivo"}</span>
                  <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              <button onClick={subirDocumento} disabled={uploading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {uploading ? "Subiendo..." : "Adjuntar documento"}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ── MODALES ── */}

      {/* Modal devolver */}
      <Modal show={showDevolver} title="↩️ Devolver pedido" onClose={() => setShowDevolver(false)}>
        <p className="text-xs text-gray-500 mb-4">El comercio recibirá tu mensaje y podrá modificar o cancelar el pedido.</p>
        <textarea rows={4} placeholder="Ej: No tenemos stock de leche, podemos entregar 15 en vez de 20."
          value={mensajeDevolucion} onChange={(e) => setMensajeDevolucion(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4" />
        <div className="flex gap-2">
          <button onClick={() => { setShowDevolver(false); setMensajeDevolucion("") }}
            className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button onClick={enviarDevolucion}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700">Enviar devolución</button>
        </div>
      </Modal>

      {/* Modal listo */}
      <Modal show={showListo} title="🟢 Marcar pedido como listo" onClose={() => setShowListo(false)}>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Cantidad de bultos *</label>
            <input type="number" min="1" placeholder="Ej: 3"
              value={bultos} onChange={(e) => setBultos(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Peso total (kg) — opcional</label>
            <input type="number" step="0.1" placeholder="Ej: 12.5"
              value={pesoKg} onChange={(e) => setPesoKg(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Dimensiones — opcional</label>
            <input type="text" placeholder="Ej: 50×30×20 cm"
              value={dimensiones} onChange={(e) => setDimensiones(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowListo(false)}
            className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button onClick={confirmarListo}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700">Confirmar</button>
        </div>
      </Modal>

      {/* Modal en transporte */}
      <Modal show={showTransporte} title="🚚 Despachar pedido" onClose={() => setShowTransporte(false)}>
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 block mb-1">Número de guía / seguimiento — opcional</label>
          <input type="text" placeholder="Ej: OCA-123456789 o vacío si no aplica"
            value={numeroGuia} onChange={(e) => setNumeroGuia(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <p className="text-xs text-gray-400 mt-1">Dejalo vacío si usás tu propio transporte.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTransporte(false)}
            className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button onClick={confirmarTransporte}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800">Marcar en camino</button>
        </div>
      </Modal>
    </>
  )
}
