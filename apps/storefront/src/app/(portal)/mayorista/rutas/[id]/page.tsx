"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""

const ESTADO_PARADA: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pendiente:  { label: "Pendiente",  color: "#92400e", bg: "#fef3c7", emoji: "⏳" },
  visitado:   { label: "Visitado",   color: "#065f46", bg: "#d1fae5", emoji: "✅" },
  omitido:    { label: "Omitido",    color: "#991b1b", bg: "#fee2e2", emoji: "⏭️" },
}

const ESTADO_RUTA: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: "Pendiente",   color: "#92400e", bg: "#fef3c7" },
  en_curso:    { label: "En curso",    color: "#1e40af", bg: "#dbeafe" },
  completada:  { label: "Completada",  color: "#065f46", bg: "#d1fae5" },
  cancelada:   { label: "Cancelada",   color: "#991b1b", bg: "#fee2e2" },
}

export default function RutaDetallePage() {
  const router = useRouter()
  const params = useParams()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const vendedorMarkerRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const trackPolylineRef = useRef<any>(null)

  const [ruta, setRuta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [vistaReporte, setVistaReporte] = useState(false)
  const [reporte, setReporte] = useState<any>(null)

  const token = () => localStorage.getItem("mayorista_token") || ""
  const headers = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token()}`,
    "x-publishable-api-key": PUB_KEY,
  })

  const cargar = useCallback(async () => {
    const t = token()
    if (!t) { router.replace("/mayorista/login"); return }
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/rutas/${params.id}`, { headers: headers() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRuta(data.ruta)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [params.id, router])

  const cargarReporte = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/rutas/${params.id}/reporte`, { headers: headers() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReporte(data.reporte)
      setVistaReporte(true)
    } catch (e: any) { setError(e.message) }
  }

  // Carga inicial y polling cada 30s si está en curso
  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!ruta || ruta.estado !== "en_curso") return
    const interval = setInterval(cargar, 30000)
    return () => clearInterval(interval)
  }, [ruta?.estado, cargar])

  // Inicializar mapa
  useEffect(() => {
    if (!ruta || !mapRef.current || mapInstance.current) return
    if (!MAPS_KEY) return

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geometry`
    script.async = true
    script.onload = () => initMap()
    document.head.appendChild(script)

    return () => { document.head.removeChild(script) }
  }, [ruta])

  // Actualizar mapa cuando cambian los datos
  useEffect(() => {
    if (mapInstance.current && ruta) updateMap()
  }, [ruta])

  const initMap = () => {
    if (!mapRef.current || !ruta) return
    const paradas = ruta.paradas || []
    const center = paradas[0]?.comercio_lat
      ? { lat: parseFloat(paradas[0].comercio_lat), lng: parseFloat(paradas[0].comercio_lng) }
      : { lat: -31.4, lng: -64.18 }

    mapInstance.current = new (window as any).google.maps.Map(mapRef.current, {
      center, zoom: 12,
      mapTypeControl: false, streetViewControl: false,
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
    })
    updateMap()
  }

  const updateMap = () => {
    const map = mapInstance.current
    if (!map || !ruta) return
    const google = (window as any).google
    const paradas = ruta.paradas || []
    const track = ruta.track || []

    // Limpiar markers anteriores
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    if (polylineRef.current) polylineRef.current.setMap(null)
    if (trackPolylineRef.current) trackPolylineRef.current.setMap(null)
    if (vendedorMarkerRef.current) vendedorMarkerRef.current.setMap(null)

    // Pins de paradas
    paradas.forEach((p: any, idx: number) => {
      if (!p.comercio_lat || !p.comercio_lng) return
      const lat = parseFloat(p.comercio_lat)
      const lng = parseFloat(p.comercio_lng)
      const color = p.estado === "visitado" ? "#059669" : p.estado === "omitido" ? "#dc2626" : "#2563eb"
      const marker = new google.maps.Marker({
        position: { lat, lng }, map,
        label: { text: String(p.orden), color: "#fff", fontWeight: "bold", fontSize: "12px" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18, fillColor: color, fillOpacity: 1,
          strokeColor: "#fff", strokeWeight: 2,
        },
        title: `${p.orden}. ${p.comercio_nombre}`,
        zIndex: p.estado === "visitado" ? 1 : 3,
      })
      const info = new google.maps.InfoWindow({
        content: `<div style="font-size:13px;font-weight:600">${p.comercio_nombre}</div>
                  <div style="font-size:12px;color:#6b7280">${p.comercio_direccion || ""}</div>
                  <div style="font-size:12px;margin-top:4px">${ESTADO_PARADA[p.estado]?.emoji} ${ESTADO_PARADA[p.estado]?.label}</div>`,
      })
      marker.addListener("click", () => info.open(map, marker))
      markersRef.current.push(marker)
    })

    // Línea planificada (ruta entre paradas)
    const rutaCoords = paradas
      .filter((p: any) => p.comercio_lat && p.comercio_lng)
      .map((p: any) => ({ lat: parseFloat(p.comercio_lat), lng: parseFloat(p.comercio_lng) }))
    if (rutaCoords.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path: rutaCoords, map,
        strokeColor: "#2563eb", strokeOpacity: 0.4, strokeWeight: 2, geodesic: true,
      })
    }

    // Track real del vendedor (línea verde)
    if (track.length > 1) {
      const trackCoords = track.map((t: any) => ({ lat: parseFloat(t.lat), lng: parseFloat(t.lng) }))
      trackPolylineRef.current = new google.maps.Polyline({
        path: trackCoords, map,
        strokeColor: "#059669", strokeOpacity: 0.8, strokeWeight: 3, geodesic: true,
      })

      // Posición actual del vendedor
      const ultimo = trackCoords[trackCoords.length - 1]
      vendedorMarkerRef.current = new google.maps.Marker({
        position: ultimo, map,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6, fillColor: "#059669", fillOpacity: 1,
          strokeColor: "#fff", strokeWeight: 2, rotation: 0,
        },
        title: "Vendedor", zIndex: 10,
      })
    }

    // Ajustar zoom
    if (rutaCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      rutaCoords.forEach((c: any) => bounds.extend(c))
      map.fitBounds(bounds)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando ruta...</p>
    </div>
  )

  if (!ruta) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error || "Ruta no encontrada"}</p>
    </div>
  )

  const paradas = ruta.paradas || []
  const visitadas = paradas.filter((p: any) => p.estado === "visitado").length
  const omitidas = paradas.filter((p: any) => p.estado === "omitido").length
  const pct = paradas.length > 0 ? Math.round((visitadas / paradas.length) * 100) : 0
  const estadoRuta = ESTADO_RUTA[ruta.estado] || ESTADO_RUTA.pendiente

  // Vista reporte
  if (vistaReporte && reporte) {
    const r = reporte.resumen
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button onClick={() => setVistaReporte(false)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-bold text-gray-900">📊 Reporte: {ruta.nombre}</span>
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Paradas visitadas", value: `${r.visitadas}/${r.total_paradas}`, color: "#059669" },
              { label: "Omitidas", value: r.omitidas, color: "#dc2626" },
              { label: "Órdenes generadas", value: r.total_ordenes, color: "#2563eb" },
              { label: "Monto total", value: `$${r.total_monto.toLocaleString("es-AR")}`, color: "#7c3aed" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {r.duracion_minutos && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Duración total</p>
              <p className="text-xl font-bold text-gray-900">{Math.floor(r.duracion_minutos / 60)}h {r.duracion_minutos % 60}min</p>
            </div>
          )}

          {/* Detalle paradas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Detalle de paradas</h3>
            <div className="space-y-2">
              {reporte.paradas.map((p: any) => {
                const ep = ESTADO_PARADA[p.estado] || ESTADO_PARADA.pendiente
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-gray-100 text-gray-600 rounded-full text-xs font-bold flex items-center justify-center">{p.orden}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.comercio_nombre}</p>
                        {p.hora_llegada && (
                          <p className="text-xs text-gray-400">
                            Llegada: {new Date(p.hora_llegada).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                            {p.hora_salida && ` · Salida: ${new Date(p.hora_salida).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: ep.color, background: ep.bg }}>
                      {ep.emoji} {ep.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Órdenes */}
          {reporte.ordenes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Órdenes del día</h3>
              <div className="space-y-2">
                {reporte.ordenes.map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
                    <span className="font-medium text-gray-900">{o.numero}</span>
                    <span className="font-bold text-gray-900">${parseFloat(o.total).toLocaleString("es-AR")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/mayorista/rutas")} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <span className="font-bold text-gray-900">{ruta.nombre}</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: estadoRuta.color, background: estadoRuta.bg }}>
                {estadoRuta.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ruta.estado === "en_curso" && (
              <button onClick={cargar} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                ↻ Actualizar
              </button>
            )}
            {(ruta.estado === "completada" || ruta.estado === "en_curso") && (
              <button onClick={cargarReporte}
                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors">
                📊 Ver reporte
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden max-w-6xl mx-auto w-full px-6 py-6 gap-6">
        {/* Sidebar paradas */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Progreso */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Progreso</span>
              <span className="text-sm font-bold text-gray-900">{visitadas}/{paradas.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="text-green-600 font-medium">✅ {visitadas} visitadas</span>
              {omitidas > 0 && <span className="text-red-500 font-medium">⏭️ {omitidas} omitidas</span>}
            </div>
            {ruta.estado === "en_curso" && (
              <p className="text-xs text-blue-600 mt-2 font-medium animate-pulse">🔴 En curso — actualizando cada 30s</p>
            )}
          </div>

          {/* Lista paradas */}
          {paradas.map((p: any) => {
            const ep = ESTADO_PARADA[p.estado] || ESTADO_PARADA.pendiente
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: p.estado === "visitado" ? "#d1fae5" : p.estado === "omitido" ? "#fee2e2" : "#dbeafe",
                             color: p.estado === "visitado" ? "#059669" : p.estado === "omitido" ? "#dc2626" : "#2563eb" }}>
                    {p.orden}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.comercio_nombre}</p>
                    {p.comercio_direccion && <p className="text-xs text-gray-400 truncate">{p.comercio_direccion}</p>}
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ color: ep.color, background: ep.bg }}>
                      {ep.emoji} {ep.label}
                    </span>
                    {p.hora_llegada && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(p.hora_llegada).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        {p.hora_salida && ` → ${new Date(p.hora_salida).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mapa */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {MAPS_KEY ? (
            <div ref={mapRef} className="w-full h-full min-h-[500px]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-400 text-sm">Google Maps no configurado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
