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

export default function CartDrawer() {
  const router = useRouter()
  const { items, mayorista_nombre, mayorista_id, removeItem, updateCantidad, clearCart,
    totalItems, totalNeto, totalIva, total, open, setOpen } = useCart()
  const [enviando, setEnviando] = useState(false)
  const [notas, setNotas] = useState("")
  const [error, setError] = useState("")
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([])
  const [medioPagoId, setMedioPagoId] = useState<string>("")

  // Cargar medios de pago cuando se abre el carrito y hay mayorista
  useEffect(() => {
    if (!open || !mayorista_id) return
    const token = localStorage.getItem("comercio_token") || ""
    fetch(`${BACKEND_URL}/store/mayoristas/${mayorista_id}/medios-pago`, {
      headers: { "Authorization": `Bearer ${token}`, "x-publishable-api-key": PUB_KEY },
    })
      .then(r => r.json())
      .then(d => {
        const medios = d.medios_pago || []
        setMediosPago(medios)
        // Seleccionar el primero por defecto si hay medios
        if (medios.length > 0 && !medioPagoId) setMedioPagoId(medios[0].id)
      })
      .catch(() => {})
  }, [open, mayorista_id])

  const medioSeleccionado = mediosPago.find(m => m.id === medioPagoId)
  const costoMedioPago = medioSeleccionado && medioSeleccionado.porcentaje_costo > 0
    ? Math.round(total * medioSeleccionado.porcentaje_costo) / 100
    : 0
  const totalConMedio = total + costoMedioPago

  if (!open) return null

  const handleConfirmar = async () => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.push("/comercio/login"); return }
    if (!items.length) return

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
          mayorista_id: items[0].mayorista_id,
          notas: notas.trim() || null,
          medio_pago_id: medioPagoId || null,
          items: items.map((i) => ({
            producto_id: i.producto_id,
            nombre: i.nombre,
            precio_unitario: i.precio_unitario,
            alicuota_iva: i.alicuota_iva,
            cantidad: i.cantidad,
            unidad: i.unidad,
          })),
        }),
      })
      let data: any = {}
      try { data = await res.json() } catch {}
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)

      clearCart()
      setOpen(false)
      setNotas("")
      setMedioPagoId("")
      router.push(`/comercio/pedidos/${data.orden.id}?nuevo=1`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Carrito</h2>
            {mayorista_nombre && (
              <p className="text-xs text-blue-600 font-medium">{mayorista_nombre}</p>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-3">🛒</span>
              <p className="text-sm">El carrito está vacío</p>
            </div>
          ) : (
            items.map((item) => (
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
                  <button onClick={() => removeItem(item.producto_id)}
                    className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateCantidad(item.producto_id, item.cantidad - 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-100 flex items-center justify-center">−</button>
                    <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                    <button onClick={() => updateCantidad(item.producto_id, item.cantidad + 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-100 flex items-center justify-center">+</button>
                  </div>
                  <span className="text-xs text-gray-400">{item.unidad}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            {/* Totales productos */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal neto</span>
                <span>${totalNeto.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA</span>
                <span>${totalIva.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-100">
                <span>Subtotal</span>
                <span>${total.toLocaleString("es-AR")}</span>
              </div>
            </div>

            {/* Selector de medio de pago */}
            {mediosPago.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medio de pago</p>
                <div className="space-y-1.5">
                  {mediosPago.map(m => {
                    const costo = m.porcentaje_costo > 0
                      ? Math.round(total * m.porcentaje_costo) / 100
                      : 0
                    const selected = medioPagoId === m.id
                    return (
                      <button key={m.id} onClick={() => setMedioPagoId(m.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-100 bg-gray-50 hover:border-gray-200"
                        }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{m.icono || "💳"}</span>
                          <div>
                            <p className={`text-sm font-medium ${selected ? "text-blue-700" : "text-gray-800"}`}>
                              {m.nombre}
                            </p>
                            {m.descripcion && (
                              <p className="text-xs text-gray-400">{m.descripcion}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          {m.porcentaje_costo > 0 ? (
                            <span className="text-xs text-orange-600 font-semibold">
                              +{m.porcentaje_costo}% = +${costo.toLocaleString("es-AR")}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 font-semibold">Sin costo</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Costo del método seleccionado */}
                {costoMedioPago > 0 && (
                  <div className="flex justify-between text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                    <span>Costo {medioSeleccionado?.nombre}</span>
                    <span className="font-semibold">+${costoMedioPago.toLocaleString("es-AR")}</span>
                  </div>
                )}

                {/* Total final */}
                <div className="flex justify-between font-black text-gray-900 text-base pt-1 border-t border-gray-200">
                  <span>Total a pagar</span>
                  <span>${totalConMedio.toLocaleString("es-AR")}</span>
                </div>
              </div>
            )}

            {/* Sin medios configurados — solo muestra el total */}
            {mediosPago.length === 0 && (
              <div className="flex justify-between font-black text-gray-900 text-base pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>${total.toLocaleString("es-AR")}</span>
              </div>
            )}

            <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas para el mayorista (opcional)..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button onClick={handleConfirmar} disabled={enviando}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm">
              {enviando ? "Enviando pedido..." : `Confirmar pedido · ${totalItems} ítem${totalItems !== 1 ? "s" : ""}`}
            </button>

            <button onClick={clearCart}
              className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1">
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  )
}
