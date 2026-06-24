"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""

type Comercio = {
  id: string
  nombre: string
  ciudad?: string
  provincia?: string
  telefono?: string
  email?: string
  direccion?: string
  lat?: number | null
  lng?: number | null
  vendedor_id?: string | null
}

type Vendedor = {
  id: string
  nombre: string
  celular?: string
  lat?: number | null
  lng?: number | null
  ultima_ubicacion?: string | null
}

function minutosDesde(ts: string | null | undefined): string {
  if (!ts) return "Sin datos"
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1) return "Ahora mismo"
  if (diff < 60) return `Hace ${diff} min`
  if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`
  return `Hace ${Math.floor(diff / 1440)} días`
}

export default function MapaPage() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [comercios, setComercio] = useState<Comercio[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [seleccionado, setSeleccionado] = useState<{ tipo: "comercio" | "vendedor"; data: Comercio | Vendedor } | null>(null)
  const [rutaPuntos, setRutaPuntos] = useState<Comercio[]>([])
  const markersRef = useRef<any[]>([])
  const directionsRendererRef = useRef<any>(null)

  const getToken = () => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("mayorista_token")
  }

  const cargarDatos = useCallback(async () => {
    const token = getToken()
    if (!token) { router.push("/mayorista/login"); return }
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/mapa`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { router.push("/mayorista/login"); return }
      const data = await res.json()
      setComercio(data.comercios || [])
      setVendedores(data.vendedores || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const id = setInterval(cargarDatos, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [cargarDatos])

  // Cargar Google Maps
  useEffect(() => {
    if (!MAPS_KEY || typeof window === "undefined") return
    if ((window as any).google?.maps) { initMap(); return }
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    script.async = true
    script.onload = initMap
    document.head.appendChild(script)
  }, [])

  // Re-renderizar marcadores cuando cambian datos
  useEffect(() => {
    if (mapInstanceRef.current) renderMarcadores()
  }, [comercios, vendedores])

  function initMap() {
    if (!mapRef.current || !(window as any).google) return
    const google = (window as any).google
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: -34.6, lng: -64.0 }, // centro de Argentina
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    })
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: { strokeColor: "#2563eb", strokeWeight: 4 },
    })
    directionsRendererRef.current.setMap(mapInstanceRef.current)
    renderMarcadores()
  }

  function renderMarcadores() {
    const google = (window as any).google
    if (!google || !mapInstanceRef.current) return

    // Limpiar marcadores anteriores
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const bounds = new google.maps.LatLngBounds()
    let hasPoints = false

    // Marcadores de comercios
    comercios.forEach((c) => {
      if (!c.lat || !c.lng) return
      hasPoints = true
      const enRuta = rutaPuntos.some((r) => r.id === c.id)
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: mapInstanceRef.current,
        title: c.nombre,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: enRuta ? 10 : 8,
          fillColor: enRuta ? "#2563eb" : "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        label: { text: "🏪", fontSize: "16px" },
      })
      marker.addListener("click", () => setSeleccionado({ tipo: "comercio", data: c }))
      markersRef.current.push(marker)
      bounds.extend({ lat: c.lat, lng: c.lng })
    })

    // Marcadores de vendedores
    vendedores.forEach((v) => {
      if (!v.lat || !v.lng) return
      hasPoints = true
      const marker = new google.maps.Marker({
        position: { lat: v.lat, lng: v.lng },
        map: mapInstanceRef.current,
        title: v.nombre,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#059669",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        label: { text: "🧑‍💼", fontSize: "16px" },
      })
      marker.addListener("click", () => setSeleccionado({ tipo: "vendedor", data: v }))
      markersRef.current.push(marker)
      bounds.extend({ lat: v.lat, lng: v.lng })
    })

    if (hasPoints) mapInstanceRef.current.fitBounds(bounds)
  }

  function calcularRuta() {
    const google = (window as any).google
    if (!google || rutaPuntos.filter((p) => p.lat && p.lng).length < 2) return
    const puntos = rutaPuntos.filter((p) => p.lat && p.lng)
    const waypoints = puntos.slice(1, -1).map((p) => ({
      location: new google.maps.LatLng(p.lat!, p.lng!),
      stopover: true,
    }))
    const svc = new google.maps.DirectionsService()
    svc.route({
      origin: new google.maps.LatLng(puntos[0].lat!, puntos[0].lng!),
      destination: new google.maps.LatLng(puntos[puntos.length - 1].lat!, puntos[puntos.length - 1].lng!),
      waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result: any, status: any) => {
      if (status === "OK") directionsRendererRef.current.setDirections(result)
    })
  }

  function toggleRuta(c: Comercio) {
    setRutaPuntos((prev) =>
      prev.some((p) => p.id === c.id)
        ? prev.filter((p) => p.id !== c.id)
        : [...prev, c]
    )
  }

  if (!MAPS_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm border">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Google Maps no configurado</h2>
          <p className="text-gray-500 text-sm">
            Agregá <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> al <code>.env.local</code> del servidor para activar el mapa.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold text-gray-900">🗺️ Mapa de campo</h1>
            <button onClick={cargarDatos} className="text-xs text-blue-600 hover:underline">Actualizar</button>
          </div>
          <p className="text-xs text-gray-400">Auto-actualiza cada 5 min</p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400">Cargando...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Vendedores */}
            <div className="p-3 border-b">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                🧑‍💼 Vendedores ({vendedores.length})
              </h2>
              {vendedores.length === 0 ? (
                <p className="text-xs text-gray-400">Sin vendedores con GPS activo</p>
              ) : vendedores.map((v) => (
                <div key={v.id} className="mb-2 p-2 rounded-xl bg-green-50 border border-green-100">
                  <div className="font-semibold text-sm text-gray-900">{v.nombre}</div>
                  <div className="text-xs text-green-700 mt-0.5">
                    {v.lat && v.lng ? `📍 ${minutosDesde(v.ultima_ubicacion)}` : "📍 Sin ubicación"}
                  </div>
                  {v.celular && <div className="text-xs text-gray-400">{v.celular}</div>}
                </div>
              ))}
            </div>

            {/* Comercios */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  🏪 Comercios ({comercios.length})
                </h2>
                {rutaPuntos.length >= 2 && (
                  <button
                    onClick={calcularRuta}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-semibold"
                  >
                    Calcular ruta ({rutaPuntos.length})
                  </button>
                )}
              </div>
              {rutaPuntos.length > 0 && rutaPuntos.length < 2 && (
                <p className="text-xs text-gray-400 mb-2">Seleccioná al menos 2 para calcular ruta</p>
              )}
              {comercios.map((c) => {
                const enRuta = rutaPuntos.some((r) => r.id === c.id)
                const tieneGeo = !!(c.lat && c.lng)
                return (
                  <div
                    key={c.id}
                    className={`mb-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                      enRuta ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                    }`}
                    onClick={() => setSeleccionado({ tipo: "comercio", data: c })}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-gray-900 truncate flex-1">{c.nombre}</div>
                      {tieneGeo && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleRuta(c) }}
                          className={`ml-2 text-xs px-2 py-0.5 rounded-lg font-semibold flex-shrink-0 ${
                            enRuta ? "bg-blue-600 text-white" : "bg-white border text-blue-600 border-blue-200"
                          }`}
                        >
                          {enRuta ? "✓ En ruta" : "+ Ruta"}
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {[c.ciudad, c.provincia].filter(Boolean).join(", ") || "Sin ubicación"}
                      {!tieneGeo && " · Sin coordenadas"}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div className="p-3 border-t bg-gray-50">
          <div className="flex gap-4 text-xs text-gray-500">
            <span>🏪 Comercio</span>
            <span>🧑‍💼 Vendedor</span>
            <span className="text-blue-600 font-semibold">● En ruta</span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Panel de detalle flotante */}
        {seleccionado && (
          <div className="absolute top-4 right-4 w-72 bg-white rounded-2xl shadow-lg border p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {seleccionado.tipo === "comercio" ? "🏪 Comercio" : "🧑‍💼 Vendedor"}
                </div>
                <div className="font-bold text-gray-900">{(seleccionado.data as any).nombre}</div>
              </div>
              <button onClick={() => setSeleccionado(null)} className="text-gray-400 text-lg hover:text-gray-600">✕</button>
            </div>

            {seleccionado.tipo === "comercio" && (() => {
              const c = seleccionado.data as Comercio
              return (
                <div className="space-y-2 text-sm">
                  {(c.ciudad || c.provincia) && (
                    <div className="text-gray-600">{[c.ciudad, c.provincia].filter(Boolean).join(", ")}</div>
                  )}
                  {c.direccion && <div className="text-gray-600">📍 {c.direccion}</div>}
                  {c.telefono && (
                    <a href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-3 py-2 font-semibold text-sm hover:bg-green-100">
                      💬 WhatsApp
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`}
                      className="flex items-center gap-2 bg-gray-50 text-gray-700 rounded-xl px-3 py-2 font-semibold text-sm hover:bg-gray-100">
                      ✉️ {c.email}
                    </a>
                  )}
                  {c.lat && c.lng && (
                    <button
                      onClick={() => toggleRuta(c)}
                      className={`w-full rounded-xl px-3 py-2 font-semibold text-sm ${
                        rutaPuntos.some((r) => r.id === c.id)
                          ? "bg-blue-100 text-blue-700"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {rutaPuntos.some((r) => r.id === c.id) ? "✓ Quitar de ruta" : "+ Agregar a ruta"}
                    </button>
                  )}
                </div>
              )
            })()}

            {seleccionado.tipo === "vendedor" && (() => {
              const v = seleccionado.data as Vendedor
              return (
                <div className="space-y-2 text-sm">
                  {v.celular && (
                    <a href={`https://wa.me/${v.celular.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-3 py-2 font-semibold hover:bg-green-100">
                      💬 {v.celular}
                    </a>
                  )}
                  <div className="text-gray-500 text-xs">
                    Última ubicación: {minutosDesde(v.ultima_ubicacion)}
                  </div>
                  {v.lat && v.lng && (
                    <div className="text-gray-400 text-xs">
                      {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {!MAPS_KEY && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-gray-400 text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <div>Configurá NEXT_PUBLIC_GOOGLE_MAPS_KEY para ver el mapa</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
