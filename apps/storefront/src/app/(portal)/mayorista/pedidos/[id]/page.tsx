"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const ESTADO_LABEL: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pendiente:  { label: "Pendiente",  color: "#92400e", bg: "#fef3c7", emoji: "⏳" },
  confirmado: { label: "Confirmado", color: "#1e40af", bg: "#dbeafe", emoji: "✅" },
  enviado:    { label: "Enviado",    color: "#5b21b6", bg: "#ede9fe", emoji: "🚚" },
  entregado:  { label: "Entregado",  color: "#065f46", bg: "#d1fae5", emoji: "📦" },
  cancelado:  { label: "Cancelado",  color: "#991b1b", bg: "#fee2e2", emoji: "✖️" },
}

const ACCIONES: Record<string, { label: string; siguiente: string; color: string }[]> = {
  pendiente:  [
    { label: "✅ Confirmar pedido",   siguiente: "confirmado", color: "bg-blue-600 text-white hover:bg-blue-700" },
    { label: "✖ Rechazar pedido",     siguiente: "cancelado",  color: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" },
  ],
  confirmado: [
    { label: "🚚 Marcar como enviado", siguiente: "enviado",   color: "bg-purple-600 text-white hover:bg-purple-700" },
    { label: "✖ Cancelar pedido",      siguiente: "cancelado", color: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" },
  ],
  enviado:    [],
  entregado:  [],
  cancelado:  [],
}

const TIPO_DOC_LABEL: Record<string, string> = {
  remito: "Remito",
  factura: "Factura",
  recibo: "Recibo",
  otro: "Otro",
}

type OrdenItem = {
  id: string
  nombre: string
  sku?: string | null
  ean?: string | null
  cantidad: number
  unidad: string
  precio_unitario: number
  alicuota_iva: number
  subtotal_neto: number
  subtotal_iva: number
  subtotal: number
}

type Orden = {
  id: string
  numero: string
  comercio_id: string
  estado: string
  notas?: string
  total_neto: number
  total_iva: number
  total: number
  medio_pago_id?: string | null
  medio_pago_nombre?: string | null
  porcentaje_costo_mp?: number
  costo_medio_pago?: number
  created_at: string
  items: OrdenItem[]
  comercio?: {
    nombre: string
    email: string
    telefono?: string
    cuit?: string
    condicion_fiscal?: string
  }
}

type Documento = {
  id: string
  nombre: string
  tipo: string
  url: string
  created_at: string
}

type Mayorista = {
  id: string
  nombre: string
  cuit: string
  email: string
  telefono?: string
  direccion?: string
  ciudad?: string
  provincia?: string
  logo_url?: string
}

export default function PedidoDetalleMayoristaPage() {
  const router = useRouter()
  const params = useParams()
  const [orden, setOrden] = useState<Orden | null>(null)
  const [mayorista, setMayorista] = useState<Mayorista | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(false)
  const [error, setError] = useState("")

  // Upload documento
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
    const t = token()
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}/documentos`, {
        headers: { "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      setDocumentos(data.documentos || [])
    } catch {}
  }

  useEffect(() => {
    cargar()
    cargarDocumentos()
  }, [params.id])

  const cambiarEstado = async (siguiente: string) => {
    const t = token()
    setAccionando(true); setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
        body: JSON.stringify({ estado: siguiente }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAccionando(false)
    }
  }

  const subirDocumento = async () => {
    if (!uploadFile || !uploadNombre.trim()) {
      setUploadError("Completá el nombre y seleccioná un archivo."); return
    }
    setUploading(true); setUploadError("")
    try {
      // Convertir a base64
      const b64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(uploadFile)
      })
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}/documentos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token()}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({ nombre: uploadNombre.trim(), tipo: uploadTipo, archivo_base64: b64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUploadNombre(""); setUploadTipo("remito"); setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await cargarDocumentos()
    } catch (e: any) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const eliminarDocumento = async (docId: string) => {
    if (!confirm("¿Eliminar este documento?")) return
    const t = token()
    await fetch(`${BACKEND_URL}/store/mayoristas/me/ordenes/${params.id}/documentos/${docId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
    })
    await cargarDocumentos()
  }

  const imprimir = () => window.print()

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

  const estado = ESTADO_LABEL[orden.estado] || { label: orden.estado, color: "#374151", bg: "#f3f4f6", emoji: "📋" }
  const acciones = ACCIONES[orden.estado] || []

  const fechaFormateada = new Date(orden.created_at).toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  })

  return (
    <>
      {/* ===== HOJA DE IMPRESIÓN — solo visible al imprimir ===== */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #orden-print, #orden-print * { visibility: visible !important; }
          #orden-print { position: fixed; top: 0; left: 0; width: 100%; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div id="orden-print" className="hidden print:block bg-white p-0 text-sm text-gray-900">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
          <div className="flex items-center gap-4">
            {mayorista?.logo_url && (
              <img src={`${BACKEND_URL}${mayorista.logo_url}`} alt="Logo" className="h-14 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{mayorista?.nombre}</h1>
              {mayorista?.cuit && <p className="text-xs text-gray-500">CUIT: {mayorista.cuit}</p>}
              {(mayorista?.ciudad || mayorista?.provincia) && (
                <p className="text-xs text-gray-500">{[mayorista.ciudad, mayorista.provincia].filter(Boolean).join(", ")}</p>
              )}
              {mayorista?.telefono && <p className="text-xs text-gray-500">Tel: {mayorista.telefono}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900">ORDEN DE VENTA</h2>
            <p className="text-lg font-semibold text-blue-700">{orden.numero}</p>
            <p className="text-xs text-gray-500">{fechaFormateada}</p>
          </div>
        </div>

        {/* Datos del comercio */}
        {orden.comercio && (
          <div className="mb-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
            <p className="font-semibold">{orden.comercio.nombre}</p>
            {orden.comercio.condicion_fiscal && <p className="text-xs text-gray-500">{orden.comercio.condicion_fiscal}</p>}
            {orden.comercio.cuit && <p className="text-xs text-gray-500">CUIT: {orden.comercio.cuit}</p>}
            {orden.comercio.email && <p className="text-xs text-gray-500">{orden.comercio.email}</p>}
          </div>
        )}

        {/* Tabla de productos */}
        <table className="w-full text-xs mb-5" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1e3a5f", color: "white" }}>
              <th className="px-2 py-2 text-left">Descripción</th>
              <th className="px-2 py-2 text-left">SKU</th>
              <th className="px-2 py-2 text-left">EAN</th>
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
                <td className="px-2 py-1.5 text-gray-500">{item.sku || "—"}</td>
                <td className="px-2 py-1.5 text-gray-500">{item.ean || "—"}</td>
                <td className="px-2 py-1.5 text-center font-semibold">{item.cantidad}</td>
                <td className="px-2 py-1.5">{item.unidad}</td>
                <td className="px-2 py-1.5 text-right">${item.precio_unitario.toLocaleString("es-AR")}</td>
                <td className="px-2 py-1.5 text-center">{item.alicuota_iva}%</td>
                <td className="px-2 py-1.5 text-right font-semibold">${item.subtotal.toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end mb-5">
          <div className="w-64 text-xs space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal neto</span><span>${orden.total_neto.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA</span><span>${orden.total_iva.toLocaleString("es-AR")}</span>
            </div>
            {orden.medio_pago_nombre && (
              <div className="flex justify-between text-gray-600">
                <span>Medio de pago</span><span className="font-medium">{orden.medio_pago_nombre}</span>
              </div>
            )}
            {Number(orden.costo_medio_pago) > 0 && (
              <div className="flex justify-between text-orange-700">
                <span>Costo método de pago ({orden.porcentaje_costo_mp}%)</span>
                <span className="font-semibold">${Number(orden.costo_medio_pago).toLocaleString("es-AR")}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
              <span>Total</span><span>${orden.total.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>

        {/* Notas */}
        {orden.notas && (
          <div className="border border-gray-200 rounded p-3 text-xs mb-4">
            <p className="font-semibold text-gray-600 mb-0.5">Notas:</p>
            <p className="text-gray-700 italic">{orden.notas}</p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-8 pt-4 border-t">
          Este documento no es un comprobante fiscal válido · Nexo B2B
        </p>
      </div>

      {/* ===== VISTA NORMAL (se oculta al imprimir) ===== */}
      <div className="print:hidden min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/mayorista/pedidos")} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-bold text-gray-900">{orden.numero}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
                style={{ color: estado.color, background: estado.bg }}>
                {estado.emoji} {estado.label}
              </span>
            </div>
            {/* Botón imprimir */}
            <button onClick={imprimir}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir OV
            </button>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-6 py-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          {/* Acciones */}
          {acciones.length > 0 && (
            <div className="space-y-2">
              {acciones.map((a) => (
                <button key={a.siguiente}
                  onClick={() => {
                    if (a.siguiente === "cancelado" && !confirm("¿Rechazar este pedido?")) return
                    cambiarEstado(a.siguiente)
                  }}
                  disabled={accionando}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${a.color}`}>
                  {accionando ? "Procesando..." : a.label}
                </button>
              ))}
            </div>
          )}

          {/* Info del comercio */}
          {orden.comercio && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Comercio</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-900">{orden.comercio.nombre}</p>
                {orden.comercio.condicion_fiscal && (
                  <p className="text-xs text-gray-500">{orden.comercio.condicion_fiscal}</p>
                )}
                {orden.comercio.cuit && (
                  <p className="text-xs text-gray-500">CUIT: {orden.comercio.cuit}</p>
                )}
                {orden.comercio.email && (
                  <a href={`mailto:${orden.comercio.email}`} className="text-xs text-blue-600 block">{orden.comercio.email}</a>
                )}
                {orden.comercio.telefono && (
                  <a href={`tel:${orden.comercio.telefono}`} className="text-xs text-blue-600 block">{orden.comercio.telefono}</a>
                )}
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
                    <p className="text-xs text-gray-400">
                      {item.cantidad} {item.unidad} × ${item.precio_unitario.toLocaleString("es-AR")} neto + IVA {item.alicuota_iva}%
                    </p>
                    {(item.sku || item.ean) && (
                      <p className="text-xs text-gray-300 mt-0.5">
                        {item.sku ? `SKU: ${item.sku}` : ""}
                        {item.sku && item.ean ? "  ·  " : ""}
                        {item.ean ? `EAN: ${item.ean}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900 flex-shrink-0 ml-4">
                    ${item.subtotal.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-4 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal neto</span><span>${orden.total_neto.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IVA</span><span>${orden.total_iva.toLocaleString("es-AR")}</span>
              </div>
              {orden.medio_pago_nombre && (
                <div className="flex justify-between text-gray-500">
                  <span>Medio de pago</span><span className="font-medium">{orden.medio_pago_nombre}</span>
                </div>
              )}
              {Number(orden.costo_medio_pago) > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Costo método de pago ({orden.porcentaje_costo_mp}%)</span>
                  <span className="font-semibold">${Number(orden.costo_medio_pago).toLocaleString("es-AR")}</span>
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

          {/* ===== DOCUMENTOS ===== */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">📎 Documentación adjunta</h3>

            {/* Lista de documentos existentes */}
            {documentos.length > 0 ? (
              <div className="space-y-2 mb-5">
                {documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg flex-shrink-0">
                        {doc.tipo === "factura" ? "🧾" : doc.tipo === "remito" ? "📋" : doc.tipo === "recibo" ? "💳" : "📄"}
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
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                        Ver
                      </a>
                      <button onClick={() => eliminarDocumento(doc.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">No hay documentos adjuntos aún.</p>
            )}

            {/* Formulario de upload */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-medium text-gray-600">Adjuntar documento</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombre del doc. ej: Factura A 001-00012"
                  value={uploadNombre}
                  onChange={(e) => setUploadNombre(e.target.value)}
                  className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={uploadTipo}
                  onChange={(e) => setUploadTipo(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="remito">Remito</option>
                  <option value="factura">Factura</option>
                  <option value="recibo">Recibo</option>
                  <option value="otro">Otro</option>
                </select>
                <label className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-blue-300 transition-colors truncate">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate text-gray-500">{uploadFile ? uploadFile.name : "Seleccionar archivo"}</span>
                  <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              <button
                onClick={subirDocumento}
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
                {uploading ? "Subiendo..." : "Adjuntar documento"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
