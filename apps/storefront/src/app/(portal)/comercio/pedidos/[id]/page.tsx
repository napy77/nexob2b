"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"

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
  // legacy compat
  pendiente:     { label: "Cargada",    color: "#92400e", bg: "#fef3c7", emoji: "📥" },
  enviado:       { label: "En camino",  color: "#1e3a8a", bg: "#dbeafe", emoji: "🚚" },
}

const TIPO_DOC_LABEL: Record<string, string> = {
  remito: "Remito", factura: "Factura", recibo: "Recibo",
  comprobante_pago: "Comprobante de pago", otro: "Otro",
}

type OrdenItem = {
  id: string
  producto_id: string
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
  mayorista_id: string
  estado: string
  notas?: string
  mensaje_mayorista?: string | null
  total_neto: number
  total_iva: number
  total: number
  medio_pago_id?: string | null
  medio_pago_nombre?: string | null
  porcentaje_costo_mp?: number
  costo_medio_pago?: number
  transporte_id?: string | null
  transporte_nombre?: string | null
  porcentaje_costo_transporte?: number
  costo_transporte?: number
  created_at: string
  items: OrdenItem[]
  // Mercado Pago
  mp_preference_id?: string | null
  mp_pago_id?: string | null
  mp_estado_pago?: string | null
  // Nuevos flags de trazabilidad
  is_pagada?: boolean
  is_facturada?: boolean
  cantidad_bultos?: number | null
  peso_kg?: number | null
  dimensiones?: string | null
  numero_guia?: string | null
}

type Documento = {
  id: string
  nombre: string
  tipo: string
  url: string
  created_at: string
}

export default function PedidoDetallePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const esNuevo = searchParams.get("nuevo") === "1"

  const [orden, setOrden] = useState<Orden | null>(null)
  const [mayoristaNombre, setMayoristaNombre] = useState("")
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(false)
  const [error, setError] = useState("")
  const [pagarLoading, setPagarLoading] = useState(false)

  const pagoResult = searchParams.get("pago") // "ok" | "pendiente" | "error" | null

  // Estado para editar cantidades en modo "devuelto"
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  // Upload comprobante de pago
  const [comprobNombre, setComprobNombre] = useState("")
  const [comprobFile, setComprobFile] = useState<File | null>(null)
  const [comprobUploading, setComprobUploading] = useState(false)
  const [comprobError, setComprobError] = useState("")
  const comprobInputRef = useRef<HTMLInputElement>(null)

  const token = () => localStorage.getItem("comercio_token") || ""

  const cargar = async () => {
    const t = token()
    if (!t) { router.replace("/comercio/login"); return }
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${params.id}`, {
        headers: { "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrden(data.orden)
      // Inicializar cantidades editables con los valores actuales
      const cants: Record<string, number> = {}
      for (const item of data.orden.items) {
        cants[item.id] = item.cantidad
      }
      setCantidades(cants)
      if (data.orden.mayorista_nombre) {
        setMayoristaNombre(data.orden.mayorista_nombre)
      } else {
        try {
          const mr = await fetch(`${BACKEND_URL}/store/mayoristas/${data.orden.mayorista_id}`, {
            headers: { "x-publishable-api-key": PUB_KEY },
          })
          if (mr.ok) {
            const md = await mr.json()
            setMayoristaNombre(md.mayorista?.nombre || "")
          }
        } catch {}
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const cargarDocumentos = async () => {
    const t = token()
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${params.id}/documentos`, {
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

  const accion = async (endpoint: string) => {
    const t = token()
    setAccionando(true); setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${params.id}/${endpoint}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
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

  const reenviarPedido = async () => {
    if (!orden) return
    const t = token()
    setAccionando(true); setError("")
    try {
      // Filtrar items con cantidad > 0
      const items = orden.items
        .filter((item) => (cantidades[item.id] ?? item.cantidad) > 0)
        .map((item) => ({
          producto_id: item.producto_id,
          nombre: item.nombre,
          sku: item.sku,
          ean: item.ean,
          precio_unitario: item.precio_unitario,
          alicuota_iva: item.alicuota_iva,
          cantidad: cantidades[item.id] ?? item.cantidad,
          unidad: item.unidad,
        }))

      if (items.length === 0) {
        setError("Debe quedar al menos un producto con cantidad mayor a cero.")
        setAccionando(false)
        return
      }

      const res = await fetch(`${BACKEND_URL}/store/ordenes/${params.id}/reenviar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${t}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({ items }),
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

  const pagarConMP = async () => {
    const t = token()
    setPagarLoading(true)
    setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${params.id}/pagar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${t}`, "x-publishable-api-key": PUB_KEY },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Redirigir al checkout de MP
      window.location.href = data.url_pago
    } catch (e: any) {
      setError(e.message)
      setPagarLoading(false)
    }
  }

  const subirComprobante = async () => {
    if (!comprobFile || !comprobNombre.trim()) {
      setComprobError("Completá el nombre y seleccioná un archivo.")
      return
    }
    setComprobUploading(true); setComprobError("")
    try {
      const b64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(comprobFile)
      })
      const res = await fetch(`${BACKEND_URL}/store/ordenes/${params.id}/documentos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token()}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({ nombre: comprobNombre.trim(), tipo: "comprobante_pago", archivo_base64: b64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setComprobNombre(""); setComprobFile(null)
      if (comprobInputRef.current) comprobInputRef.current.value = ""
      await cargarDocumentos()
      await cargar() // refresca is_pagada
    } catch (e: any) {
      setComprobError(e.message)
    } finally {
      setComprobUploading(false)
    }
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
  const esDevuelto = orden.estado === "devuelto"

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/comercio/pedidos")} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-gray-900">{orden.numero}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
            style={{ color: estado.color, background: estado.bg }}>
            {estado.emoji} {estado.label}
          </span>
          {orden.is_facturada && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">🧾 Facturada</span>}
          {orden.is_pagada && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">💰 Pagada</span>}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {esNuevo && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-4 text-sm font-medium">
            ✅ ¡Pedido enviado! El mayorista lo recibirá pronto.
          </div>
        )}

        {/* Resultado de pago MP */}
        {pagoResult === "ok" && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-4 text-sm font-medium">
            💳 ¡Pago procesado exitosamente con Mercado Pago!
          </div>
        )}
        {pagoResult === "pendiente" && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl px-5 py-4 text-sm font-medium">
            ⏳ Tu pago está en proceso. Te avisaremos cuando se confirme.
          </div>
        )}
        {pagoResult === "error" && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
            ❌ El pago no pudo completarse. Podés intentarlo nuevamente.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Banner de devuelto con mensaje del mayorista */}
        {esDevuelto && orden.mensaje_mayorista && (
          <div className="bg-orange-50 border border-orange-300 rounded-2xl px-5 py-4">
            <p className="text-sm font-bold text-orange-800 mb-1">↩️ El mayorista devolvió tu pedido</p>
            <p className="text-sm text-orange-700 italic">"{orden.mensaje_mayorista}"</p>
            <p className="text-xs text-orange-600 mt-2">
              Podés modificar las cantidades abajo y reenviar, o cancelar el pedido.
            </p>
          </div>
        )}

        {/* Datos del pedido */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>Mayorista: <span className="font-medium text-gray-700">{mayoristaNombre}</span></p>
            <p>Fecha: {new Date(orden.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            {orden.notas && <p>Notas: <span className="italic">{orden.notas}</span></p>}
            {orden.mp_estado_pago && (
              <p>Pago MP:&nbsp;
                <span className={`font-semibold ${
                  orden.mp_estado_pago === "aprobado" ? "text-green-600" :
                  orden.mp_estado_pago === "rechazado" ? "text-red-600" :
                  orden.mp_estado_pago === "en_proceso" ? "text-blue-600" :
                  "text-yellow-700"
                }`}>
                  {{
                    aprobado: "✅ Aprobado",
                    rechazado: "❌ Rechazado",
                    en_proceso: "🔄 En proceso",
                    cancelado: "✖ Cancelado",
                    reembolsado: "↩ Reembolsado",
                    pendiente: "⏳ Pendiente",
                  }[orden.mp_estado_pago] || orden.mp_estado_pago}
                </span>
              </p>
            )}
          </div>
          {/* Info de bultos (si está listo o en camino) */}
          {(estadoKey === "listo" || estadoKey === "en_transporte") && orden.cantidad_bultos && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">📦 Preparación del pedido</p>
              <p className="text-xs text-gray-700">{orden.cantidad_bultos} bulto{orden.cantidad_bultos !== 1 ? "s" : ""}
                {orden.peso_kg ? ` · ${orden.peso_kg} kg` : ""}
                {orden.dimensiones ? ` · ${orden.dimensiones}` : ""}
              </p>
            </div>
          )}
          {/* Número de guía (si está en camino) */}
          {estadoKey === "en_transporte" && orden.numero_guia && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">🚚 Número de guía</p>
              <p className="text-xs font-mono font-semibold text-blue-800">{orden.numero_guia}</p>
            </div>
          )}
        </div>

        {/* Productos — con cantidades editables si está en "devuelto" */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">
            Productos {esDevuelto && <span className="text-orange-600 font-normal text-xs">(podés modificar cantidades)</span>}
          </h3>
          <div className="space-y-3">
            {orden.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{item.nombre}</p>
                  {esDevuelto ? (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setCantidades((c) => ({ ...c, [item.id]: Math.max(0, (c[item.id] ?? item.cantidad) - 1) }))}
                        className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-base font-bold">
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={cantidades[item.id] ?? item.cantidad}
                        onChange={(e) => setCantidades((c) => ({ ...c, [item.id]: Math.max(0, Number(e.target.value)) }))}
                        className="w-14 text-center border border-orange-300 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <button
                        onClick={() => setCantidades((c) => ({ ...c, [item.id]: (c[item.id] ?? item.cantidad) + 1 }))}
                        className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-base font-bold">
                        +
                      </button>
                      <span className="text-xs text-gray-400">{item.unidad}</span>
                      {(cantidades[item.id] ?? item.cantidad) === 0 && (
                        <span className="text-xs text-red-500">se eliminará</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">{item.cantidad} {item.unidad} × ${item.precio_unitario.toLocaleString("es-AR")} neto + IVA {item.alicuota_iva}%</p>
                  )}
                </div>
                {!esDevuelto && (
                  <span className="font-semibold text-gray-900 flex-shrink-0 ml-4">
                    ${item.subtotal.toLocaleString("es-AR")}
                  </span>
                )}
              </div>
            ))}
          </div>

          {!esDevuelto && (
            <div className="border-t border-gray-100 mt-4 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal neto</span><span>${orden.total_neto.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IVA</span><span>${orden.total_iva.toLocaleString("es-AR")}</span>
              </div>
              {orden.medio_pago_nombre && (
                <div className="flex justify-between text-gray-500">
                  <span>Medio de pago</span>
                  <span className="font-medium">{orden.medio_pago_nombre}</span>
                </div>
              )}
              {Number(orden.costo_medio_pago) > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Costo de método de pago ({orden.porcentaje_costo_mp}%)</span>
                  <span className="font-semibold">+${Number(orden.costo_medio_pago).toLocaleString("es-AR")}</span>
                </div>
              )}
              {orden.transporte_nombre && (
                <div className="flex justify-between text-gray-500">
                  <span>Transporte</span>
                  <span className="font-medium">{orden.transporte_nombre}</span>
                </div>
              )}
              {Number(orden.costo_transporte) > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Costo de transporte ({orden.porcentaje_costo_transporte}%)</span>
                  <span className="font-semibold">+${Number(orden.costo_transporte).toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>Total</span><span>${orden.total.toLocaleString("es-AR")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Documentos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">📎 Documentos adjuntos</h3>
          {documentos.length === 0 ? (
            <p className="text-xs text-gray-400 mb-4">Sin documentos adjuntos aún.</p>
          ) : (
            <div className="space-y-2 mb-4">
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
                  <a href={`${BACKEND_URL}${doc.url}`} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors flex-shrink-0 ml-2">
                    Ver
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Upload comprobante de pago */}
          {!orden.is_pagada && !["cancelado", "entregado"].includes(orden.estado) && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-600 mb-3">💸 Adjuntar comprobante de pago</p>
              <div className="space-y-2">
                <input type="text" placeholder="Nombre ej: Transferencia 15/07"
                  value={comprobNombre} onChange={(e) => setComprobNombre(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <label className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-blue-300">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-gray-500 truncate">{comprobFile ? comprobFile.name : "Seleccionar archivo (PDF o imagen)"}</span>
                  <input ref={comprobInputRef} type="file" accept=".pdf,image/*" className="hidden"
                    onChange={(e) => setComprobFile(e.target.files?.[0] || null)} />
                </label>
                {comprobError && <p className="text-xs text-red-600">{comprobError}</p>}
                <button onClick={subirComprobante} disabled={comprobUploading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {comprobUploading ? "Subiendo..." : "Adjuntar comprobante"}
                </button>
              </div>
            </div>
          )}
          {orden.is_pagada && (
            <div className="border-t border-gray-100 pt-3 text-center">
              <span className="text-xs text-green-600 font-semibold">✓ Comprobante de pago registrado</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="space-y-2">
          {/* Estado devuelto: reenviar o cancelar */}
          {esDevuelto && (
            <>
              <button
                onClick={reenviarPedido}
                disabled={accionando}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-60 text-sm">
                {accionando ? "Enviando..." : "↩️ Reenviar pedido modificado"}
              </button>
              <button
                onClick={() => { if (confirm("¿Cancelar este pedido?")) accion("cancelar") }}
                disabled={accionando}
                className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-semibold hover:bg-red-100 transition-colors disabled:opacity-60 text-sm">
                ✖ Cancelar pedido
              </button>
            </>
          )}

          {/* Confirmar recepción: en camino O listo para retiro */}
          {["en_transporte", "enviado", "listo"].includes(orden.estado) && (
            <button onClick={() => accion("entregar")} disabled={accionando}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 text-sm">
              {accionando ? "Procesando..." : "✅ Confirmar recepción"}
            </button>
          )}

          {/* Pagar con MP + cancelar — disponible mientras no esté entregado/cancelado */}
          {["cargada", "pendiente", "confirmado", "armando", "listo"].includes(orden.estado) && (
            <>
              {orden.mp_estado_pago !== "aprobado" && (
                <button
                  onClick={pagarConMP}
                  disabled={pagarLoading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-60"
                  style={{ background: pagarLoading ? "#9ca3af" : "#009ee3" }}>
                  {pagarLoading ? "Redirigiendo a Mercado Pago..." : "💳 Pagar con Mercado Pago"}
                </button>
              )}
            </>
          )}

          {/* Cancelar — solo desde cargada/devuelto */}
          {["cargada", "pendiente", "devuelto"].includes(orden.estado) && (
            <button onClick={() => { if (confirm("¿Cancelar este pedido?")) accion("cancelar") }}
              disabled={accionando}
              className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-semibold hover:bg-red-100 transition-colors disabled:opacity-60 text-sm">
              {accionando ? "Procesando..." : "Cancelar pedido"}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
