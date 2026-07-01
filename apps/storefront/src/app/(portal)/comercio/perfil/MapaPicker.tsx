"use client"

import { useEffect, useRef, useState, useCallback } from "react"

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""

export function MapaPicker({ lat, lng, direccion, ciudad, provincia, onChange }: {
  lat: number | null; lng: number | null
  direccion: string; ciudad: string; provincia: string
  onChange: (data: { lat: number; lng: number; direccion?: string; ciudad?: string; provincia?: string }) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
  )

  const placeMarker = useCallback((newLat: number, newLng: number, extra?: { direccion?: string; ciudad?: string; provincia?: string }) => {
    if (!markerRef.current) return
    markerRef.current.setPosition({ lat: newLat, lng: newLng })
    markerRef.current.setVisible(true)
    setCoords({ lat: newLat, lng: newLng })
    onChange({ lat: newLat, lng: newLng, ...extra })
  }, [onChange])

  const initMap = useCallback(() => {
    const google = (window as any).google
    if (!google || !mapRef.current) return
    const center = lat && lng ? { lat: Number(lat), lng: Number(lng) } : { lat: -31.4, lng: -64.2 }

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center, zoom: lat && lng ? 15 : 6,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    })

    markerRef.current = new google.maps.Marker({
      position: center, map: mapInstance.current,
      draggable: true, title: "Arrastrá para ajustar",
      visible: !!(lat && lng),
    })

    // Click en el mapa para poner/mover el pin
    mapInstance.current.addListener("click", (e: any) => {
      placeMarker(e.latLng.lat(), e.latLng.lng())
    })

    // Drag del pin
    markerRef.current.addListener("dragend", () => {
      const pos = markerRef.current.getPosition()
      placeMarker(pos.lat(), pos.lng())
    })

    // Autocomplete de Places (si la API está habilitada)
    if (inputRef.current && google.maps.places?.Autocomplete) {
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "ar" },
        fields: ["geometry", "address_components"],
      })
      ac.addListener("place_changed", () => {
        const place = ac.getPlace()
        if (!place.geometry?.location) return
        const newLat = place.geometry.location.lat()
        const newLng = place.geometry.location.lng()
        mapInstance.current.setCenter({ lat: newLat, lng: newLng })
        mapInstance.current.setZoom(16)
        let street = "", num = "", ciu = "", prov = ""
        for (const c of place.address_components || []) {
          if (c.types.includes("route")) street = c.long_name
          if (c.types.includes("street_number")) num = c.long_name
          if (c.types.includes("locality")) ciu = c.long_name
          if (c.types.includes("administrative_area_level_1")) prov = c.long_name
        }
        placeMarker(newLat, newLng, {
          direccion: [street, num].filter(Boolean).join(" ") || undefined,
          ciudad: ciu || undefined, provincia: prov || undefined,
        })
      })
    }

    setMapReady(true)
  }, [placeMarker])

  // Búsqueda manual via Geocoding API (fallback si Places no está habilitado)
  const buscarDireccion = async () => {
    const q = inputRef.current?.value?.trim()
    if (!q || !MAPS_KEY) return
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q + ", Argentina")}&key=${MAPS_KEY}`
      )
      const data = await r.json()
      if (data.status === "OK" && data.results?.[0]) {
        const { lat: newLat, lng: newLng } = data.results[0].geometry.location
        mapInstance.current?.setCenter({ lat: newLat, lng: newLng })
        mapInstance.current?.setZoom(16)
        placeMarker(newLat, newLng)
      } else {
        alert("No se encontró la dirección. Intentá con otra búsqueda o hacé click en el mapa.")
      }
    } catch {}
  }

  useEffect(() => {
    if (!MAPS_KEY) return
    if ((window as any).google?.maps) { initMap(); return }
    if (document.getElementById("gmaps-script")) {
      const t = setInterval(() => { if ((window as any).google?.maps) { clearInterval(t); initMap() } }, 200)
      return () => clearInterval(t)
    }
    const s = document.createElement("script")
    s.id = "gmaps-script"
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    s.async = true; s.onload = initMap
    document.head.appendChild(s)
  }, [initMap])

  useEffect(() => {
    if (!mapReady || !markerRef.current || !lat || !lng) return
    const nLat = Number(lat), nLng = Number(lng)
    markerRef.current.setPosition({ lat: nLat, lng: nLng })
    markerRef.current.setVisible(true)
    mapInstance.current?.setCenter({ lat: nLat, lng: nLng })
    mapInstance.current?.setZoom(15)
    setCoords({ lat: nLat, lng: nLng })
  }, [lat, lng, mapReady])

  if (!MAPS_KEY) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
      <div>
        <h2 className="font-semibold text-gray-800">Ubicación en el mapa</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Escribí tu dirección y presioná Buscar, o hacé click directamente en el mapa para marcar tu ubicación
        </p>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ej: San Martín 336, Bell Ville"
          defaultValue={[direccion, ciudad, provincia].filter(Boolean).join(", ")}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarDireccion() } }}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={buscarDireccion}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          Buscar
        </button>
      </div>
      <div
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden border border-gray-100"
        style={{ height: 300, cursor: "crosshair" }}
      />
      {coords
        ? <p className="text-xs text-green-600 font-medium">📍 Ubicación marcada: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} — podés arrastrar el pin para ajustar</p>
        : <p className="text-xs text-amber-600">Hacé click en el mapa para marcar la ubicación de tu comercio</p>
      }
    </div>
  )
}
