"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "../../lib/comercio/cart"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type MedioPago = {
  id: string
  nombre: string
  tipo: string
  icono: string | null
  descripcion: string | null
  porcentaje_costo: number
}

type Transporte = {
  id: string
  nombre: string
  tipo: string
  icono: string | null
  descripcion: string | null
  porcentaje_costo: number
}

type Paso = "carrito" | "transporte" | "pago"

export default function CartDrawer() {
  const router = useRouter()
  const {
    mayoristas, activeItems, openMayoristaId, setOpenMayoristaId,
    removeItem, updateCantidad, clearCart,
    totalItems, open, setOpen,
  } = useCart()

  const [paso, setPaso] = useState<Paso>("carrito")
  const [enviando, setEnviando] = useState(false)
  const [notas, setNotas] = useState("")
  const [error, setError] = useState("")
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([])
  const [medioPagoId, setMedioPagoId] = useState<string>("")
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [transporteId, setTransporteId] = useState<string>("")

  // Código de descuento
  const [codigoInput, setCodigoInput] = useState("")
  const [codigoDescuentoId, setCodigoDescuentoId] = useState<string | null>(null)
  const [montoDescuento, setMontoDescuento] = useState(0)
  const [validandoCodigo, setValidandoCodigo] = useState(false)
  const [codigoError, setCodigoError] = useState("")
  const [codigoOk, setCodigoOk] = useState("")

  const mayorista_nombre = mayoristas.find((m) => m.id === openMayoristaId)?.nombre || ""

  // Totales del carrito activo
  const totalNeto = activeItems.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const totalIva  = activeItems.reduce((s, i) => s + i.precio_unitario * i.cantidad * (i.alicuota_iva / 100), 0)
  const total     = Math.round((totalNeto + totalIva) * 100) / 100

  // Cargar medios de pago y transportes cuando se abre o cambia el mayorista activo
  useEffect(() => {
    if (!open || !openMayoristaId) return
    const token = localStorage.getItem("comercio_token") || ""
    const headers: HeadersInit = { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY }

    setMediosPago([]); setTransportes([]); setMedioPagoId(""); setTransporteId("")

    fetch(`${BACKEND_URL}/store/mayoristas/${openMayoristaId}/medios-pago`, { headers })
      .then(r => r.json())
      .then(d => {
        const medios = d.medios_pago || []
        setMediosPago(medios)
        if (medios.length > 0) setMedioPagoId(medios[0].id)
      })
      .catch(() => {})

    fetch(`${BACKEND_URL}/store/mayoristas/${openMayoristaId}/transportes`, { headers })
      .then(r => r.json())
      .then(d => {
        const trList = d.transportes || []
        setTransportes(trList)
        if (trList.length > 0) setTransporteId(trList[0].id)
      })
      .catch(() => {})
  }, [open, openMayoristaId])

  // Al cambiar de carrito (tab), volver al paso 1
  const resetCodigo = () => {
    setCodigoInput(""); setCodigoDescuentoId(null); setMontoDescuento(0); setCodigoError(""); setCodigoOk("")
  }

  const switchMayorista = (id: string) => {
    setOpenMayoristaId(id)
    setPaso("carrito")
    setError("")
    setNotas("")
    resetCodigo()
  }

  const validarCodigo = async () => {
    if (!codigoInput.trim() || !openMayoristaId) return
    setValidandoCodigo(true)
    setCodigoError("")
    setCodigoOk("")
    try {
      const token = localStorage.getItem("comercio_token") || ""
      const res = await fetch(
        `${BACKEND_URL}/store/mayoristas/${openMayoristaId}/codigos-descuento/validar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
          body: JSON.stringify({ codigo: codigoInput.trim(), total: totalFinal }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCodigoDescuentoId(data.codigo_descuento_id)
      setMontoDescuento(data.monto_descuento)
      setCodigoOk(`¡Descuento aplicado! −$${data.monto_descuento.toLocaleString("es-AR")}`)
    } catch (e: any) {
      setCodigoError(e.message)
      setCodigoDescuentoId(null)
      setMontoDescuento(0)
    } finally {
      setValidandoCodigo(false)
    }
  }

  const cerrar = () => {
    setOpen(false)
    setPaso("carrito")
    setError("")
  }

  const medioSeleccionado = mediosPago.find(m => m.id === medioPagoId)
  const costoMedioPago = medioSeleccionado && medioSeleccionado.porcentaje_costo > 0
    ? Math.round(total * medioSeleccionado.porcentaje_costo) / 100
    : 0

  const transporteSeleccionado = transportes.find(t => t.id === transporteId)
  const costoTransporte = transporteSeleccionado && transporteSeleccionado.porcentaje_costo > 0
    ? Math.round(total * transporteSeleccionado.porcentaje_costo) / 100
    : 0

  const totalFinal = total + costoMedioPago + costoTransporte - montoDescuento

  const pasosVisibles: Paso[] = transportes.length > 0
    ? ["carrito", "transporte", "pago"]
    : ["carrito", "pago"]

  const pasoActualIdx = pasosVisibles.indexOf(paso)
  const pasosig = pasosVisibles[pasoActualIdx + 1] as Paso | undefined

  if (!open) return null

  const handleConfirmar = async () => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.push("/comercio/login"); return }
    if (!activeItems.length || !openMayoristaId) return

    setEnviando(true)
    setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/store/ordenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({
          mayorista_id: openMayoristaId,
          notas: notas.trim() || null,
          medio_pago_id: medioPagoId || null,
          transporte_id: transporteId || null,
          codigo_descuento_id: codigoDescuentoId || null,
          items: activeItems.map((i) =>
            // Catálogo nuevo: enviar presentacion_id + cantidad (el backend resuelve precio)
            // Catálogo viejo: enviar campos planos (legado)
            i.presentacion_id
              ? { presentacion_id: i.presentacion_id, cantidad: i.cantidad }
              : { producto_id: i.producto_id, nombre: i.nombre, precio_unitario: i.precio_unitario, alicuota_iva: i.alicuota_iva, cantidad: i.cantidad, unidad: i.unidad }
          ),
        }),
      })
      let data: any = {}
      try { data = await res.json() } catch {}
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)

      clearCart(openMayoristaId)
      cerrar()
      setNotas("")
      setMedioPagoId("")
      setTransporteId("")
      resetCodigo()
      router.push(`/comercio/pedidos/${data.orden.id}?nuevo=1`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const tituloPaso: Record<Paso, string> = {
    carrito:    "Carrito",
    transporte: "Elegí el transporte",
    pago:       "Forma de pago",
  }

  const activeCount = activeItems.reduce((s, i) => s + i.cantidad, 0)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={cerrar} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl">

        {/* Tabs de mayoristas (si hay más de uno) */}
        {mayoristas.length > 1 && (
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {mayoristas.map((m) => (
              <button
                key={m.id}
                onClick={() => switchMayorista(m.id)}
                className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  m.id === openMayoristaId
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {paso !== "carrito" && (
              <button onClick={() => setPaso(pasosVisibles[pasoActualIdx - 1])}
                className="text-gray-400 hover:text-gray-600 p-1 -ml-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{tituloPaso[paso]}</h2>
              {mayorista_nombre && mayoristas.length === 1 && (
                <p className="text-xs text-blue-600 font-medium">{mayorista_nombre}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Indicador de pasos */}
            <div className="flex gap-1">
              {pasosVisibles.map((p, i) => (
                <div key={p} className={`h-1.5 rounded-full transition-all ${
                  i === pasoActualIdx ? "w-5 bg-blue-500" : i < pasoActualIdx ? "w-2 bg-blue-300" : "w-2 bg-gray-200"
                }`} />
              ))}
            </div>
            <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── PASO 1: CARRITO ─────────────────────────────────────────────── */}
        {paso === "carrito" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {activeItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="text-4xl block mb-3">🛒</span>
                  <p className="text-sm">El carrito está vacío</p>
                </div>
              ) : (
                activeItems.map((item) => (
                  <div key={item.producto_id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ${item.precio_unitario.toLocaleString("es-AR")} neto + IVA {item.alicuota_iva}%
                      </p>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">
                        Subtotal: ${(item.precio_unitario * item.cantidad * (1 + item.alicuota_iva / 100)).toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <button onClick={() => removeItem(item.producto_id, item.mayorista_id)}
                        className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateCantidad(item.producto_id, item.cantidad - 1, item.mayorista_id)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-100 flex items-center justify-center">−</button>
                        <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                        <button onClick={() => updateCantidad(item.producto_id, item.cantidad + 1, item.mayorista_id)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-100 flex items-center justify-center">+</button>
                      </div>
                      <span className="text-xs text-gray-400">{item.unidad}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {activeItems.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal neto</span><span>${totalNeto.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>IVA</span><span>${totalIva.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                    <span>Subtotal</span><span>${total.toLocaleString("es-AR")}</span>
                  </div>
                </div>
                <button onClick={() => setPaso(pasosig!)}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm">
                  Continuar →
                </button>
                <button onClick={() => openMayoristaId && clearCart(openMayoristaId)}
                  className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1">
                  Vaciar carrito
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── PASO 2: TRANSPORTE ──────────────────────────────────────────── */}
        {paso === "transporte" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {transportes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">El mayorista no configuró opciones de transporte.</p>
              ) : (
                transportes.map(t => {
                  const costo = t.porcentaje_costo > 0
                    ? Math.round(total * t.porcentaje_costo) / 100
                    : 0
                  const selected = transporteId === t.id
                  return (
                    <button key={t.id} onClick={() => setTransporteId(t.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all ${
                        selected
                          ? "border-green-500 bg-green-50"
                          : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{t.icono || "🚚"}</span>
                        <div>
                          <p className={`text-sm font-semibold ${selected ? "text-green-700" : "text-gray-800"}`}>
                            {t.nombre}
                          </p>
                          {t.descripcion && (
                            <p className="text-xs text-gray-400 mt-0.5">{t.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        {t.porcentaje_costo > 0 ? (
                          <span className="text-xs text-orange-600 font-semibold">
                            +{t.porcentaje_costo}%<br />
                            <span className="text-orange-500">+${costo.toLocaleString("es-AR")}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 font-semibold">Sin costo</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-4 space-y-3">
              {costoTransporte > 0 && (
                <div className="flex justify-between text-sm text-orange-700 bg-orange-50 rounded-xl px-4 py-2.5">
                  <span>Costo {transporteSeleccionado?.nombre}</span>
                  <span className="font-semibold">+${costoTransporte.toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Subtotal con transporte</span>
                <span>${(total + costoTransporte).toLocaleString("es-AR")}</span>
              </div>
              <button onClick={() => setPaso("pago")}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm">
                Continuar →
              </button>
            </div>
          </>
        )}

        {/* ─── PASO 3: FORMA DE PAGO ───────────────────────────────────────── */}
        {paso === "pago" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {mediosPago.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">El mayorista no configuró medios de pago.</p>
              ) : (
                mediosPago.map(m => {
                  const costo = m.porcentaje_costo > 0
                    ? Math.round(total * m.porcentaje_costo) / 100
                    : 0
                  const selected = medioPagoId === m.id
                  return (
                    <button key={m.id} onClick={() => setMedioPagoId(m.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{m.icono || "💳"}</span>
                        <div>
                          <p className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-gray-800"}`}>
                            {m.nombre}
                          </p>
                          {m.descripcion && (
                            <p className="text-xs text-gray-400 mt-0.5">{m.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        {m.porcentaje_costo > 0 ? (
                          <span className="text-xs text-orange-600 font-semibold">
                            +{m.porcentaje_costo}%<br />
                            <span className="text-orange-500">+${costo.toLocaleString("es-AR")}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 font-semibold">Sin costo</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}

              {/* Campo código de descuento */}
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-600 mb-1.5">¿Tenés un código de descuento?</p>
                {codigoDescuentoId ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="font-mono text-sm font-semibold text-green-700">{codigoInput.toUpperCase()}</span>
                      <span className="text-xs text-green-600">{codigoOk}</span>
                    </div>
                    <button onClick={resetCodigo} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoInput}
                      onChange={(e) => { setCodigoInput(e.target.value.toUpperCase()); setCodigoError("") }}
                      placeholder="CÓDIGO"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
                    />
                    <button
                      onClick={validarCodigo}
                      disabled={!codigoInput.trim() || validandoCodigo}
                      className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-40">
                      {validandoCodigo ? "..." : "Aplicar"}
                    </button>
                  </div>
                )}
                {codigoError && <p className="text-xs text-red-600 mt-1">{codigoError}</p>}
              </div>

              <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas para el mayorista (opcional)..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2" />
            </div>

            <div className="border-t border-gray-100 px-5 py-4 space-y-3">
              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Productos</span><span>${total.toLocaleString("es-AR")}</span>
                </div>
                {costoTransporte > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Transporte ({transporteSeleccionado?.nombre})</span>
                    <span>+${costoTransporte.toLocaleString("es-AR")}</span>
                  </div>
                )}
                {costoMedioPago > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Costo financiero ({medioSeleccionado?.nombre})</span>
                    <span>+${costoMedioPago.toLocaleString("es-AR")}</span>
                  </div>
                )}
                {montoDescuento > 0 && (
                  <div className="flex justify-between text-green-700 font-medium">
                    <span>Descuento ({codigoInput.toUpperCase()})</span>
                    <span>−${montoDescuento.toLocaleString("es-AR")}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-gray-900 text-base pt-1 border-t border-gray-200">
                  <span>Total a pagar</span><span>${totalFinal.toLocaleString("es-AR")}</span>
                </div>
              </div>

              <button onClick={handleConfirmar} disabled={enviando}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm">
                {enviando ? "Enviando pedido..." : `Confirmar orden · ${activeCount} ítem${activeCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}

      </div>
    </>
  )
}
