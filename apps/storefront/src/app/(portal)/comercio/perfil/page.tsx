"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi, RUBROS_DISPONIBLES, PROVINCIAS_ARGENTINA, ApiError } from "../../../../lib/comercio/api"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""

type TipoImpositivo = { id: string; nombre: string; descripcion?: string }

const TIPOS_FALLBACK: TipoImpositivo[] = [
  { id: "ri", nombre: "Responsable Inscripto", descripcion: "Factura A — precio + IVA" },
  { id: "mono", nombre: "Monotributo", descripcion: "Factura C — precio con impuestos incluidos" },
  { id: "exento", nombre: "Exento", descripcion: "Sin cobro de IVA" },
  { id: "cf", nombre: "Consumidor Final", descripcion: "Persona física sin CUIT empresa" },
]

function MapaPicker({ lat, lng, direccion, ciudad, provincia, onChange }: {
  lat: number | null; lng: number | null
  direccion: string; ciudad: string; provincia: string
  onChange: (data: { lat: number; lng: number; direccion?: string; ciudad?: string; provincia?: string }) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const autocompleteRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [mapReady, setMapReady] = useState(false)

  const initMap = useCallback(() => {
    const google = (window as any).google
    if (!google || !mapRef.current) return
    const center = lat && lng ? { lat, lng } : { lat: -31.4, lng: -64.2 }
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center, zoom: lat && lng ? 15 : 6,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    })
    markerRef.current = new google.maps.Marker({
      position: center, map: mapInstance.current,
      draggable: true, title: "Arrastrá para ajustar", visible: !!(lat && lng),
    })
    markerRef.current.addListener("dragend", () => {
      const pos = markerRef.current.getPosition()
      onChange({ lat: pos.lat(), lng: pos.lng() })
    })
    if (inputRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "ar" },
        fields: ["geometry", "address_components"],
      })
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace()
        if (!place.geometry?.location) return
        const newLat = place.geometry.location.lat()
        const newLng = place.geometry.location.lng()
        mapInstance.current.setCenter({ lat: newLat, lng: newLng })
        mapInstance.current.setZoom(16)
        markerRef.current.setPosition({ lat: newLat, lng: newLng })
        markerRef.current.setVisible(true)
        let street = "", num = "", ciu = "", prov = ""
        for (const c of place.address_components || []) {
          if (c.types.includes("route")) street = c.long_name
          if (c.types.includes("street_number")) num = c.long_name
          if (c.types.includes("locality")) ciu = c.long_name
          if (c.types.includes("administrative_area_level_1")) prov = c.long_name
        }
        onChange({ lat: newLat, lng: newLng,
          direccion: [street, num].filter(Boolean).join(" ") || undefined,
          ciudad: ciu || undefined, provincia: prov || undefined,
        })
      })
    }
    setMapReady(true)
  }, [])

  useEffect(() => {
    if (!MAPS_KEY) return
    if ((window as any).google?.maps) { initMap(); return }
    if (document.getElementById("gmaps-script")) { 
      const wait = setInterval(() => { if ((window as any).google?.maps) { clearInterval(wait); initMap() } }, 200)
      return
    }
    const s = document.createElement("script")
    s.id = "gmaps-script"
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    s.async = true; s.onload = initMap
    document.head.appendChild(s)
  }, [initMap])

  useEffect(() => {
    if (!mapReady || !markerRef.current) return
    if (lat && lng) {
      markerRef.current.setPosition({ lat, lng })
      markerRef.current.setVisible(true)
      mapInstance.current?.setCenter({ lat, lng })
      mapInstance.current?.setZoom(15)
    }
  }, [lat, lng, mapReady])

  if (!MAPS_KEY) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
      <div>
        <h2 className="font-semibold text-gray-800">Ubicación en el mapa</h2>
        <p className="text-xs text-gray-400 mt-0.5">Buscá tu dirección o arrastrá el pin para ajustar la posición exacta</p>
      </div>
      <div className="relative">
        <input ref={inputRef} type="text" placeholder="Buscar dirección..."
          defaultValue={[direccion, ciudad, provincia].filter(Boolean).join(", ")}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">📍</span>
      </div>
      <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-gray-100" style={{ height: 280 }} />
      {lat && lng && (
        <p className="text-xs text-gray-400">Coordenadas: {lat.toFixed(5)}, {lng.toFixed(5)} — podés arrastrar el pin para ajustar</p>
      )}
    </div>
  )
}

export default function ComercioPerfilPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [cuit, setCuit] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [tiposImpositivos, setTiposImpositivos] = useState<TipoImpositivo[]>(TIPOS_FALLBACK)
  const [form, setForm] = useState({
    nombre: "", telefono: "", direccion: "", ciudad: "", provincia: "",
    rubros: [] as string[], condicion_fiscal: "",
  })
  const [geoCoords, setGeoCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })

  useEffect(() => {
    fetch(`${BACKEND_URL}/store/taxonomia`, { headers: { "x-publishable-api-key": PUB_KEY } })
      .then((r) => r.json()).then((d) => { if (d.tipos_impositivos?.length) setTiposImpositivos(d.tipos_impositivos) }).catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("comercio_token")
    if (!token) { router.replace("/comercio/login"); return }
    comerciosApi.getMe(token).then((data) => {
      const c = data.comercio
      setEmail(c.email); setCuit(c.cuit || "")
      setForm({ nombre: c.nombre || "", telefono: c.telefono || "", direccion: c.direccion || "",
        ciudad: c.ciudad || "", provincia: c.provincia || "", rubros: c.rubros || [], condicion_fiscal: c.condicion_fiscal || "" })
      if (c.lat && c.lng) setGeoCoords({ lat: parseFloat(c.lat), lng: parseFloat(c.lng) })
    }).catch((err) => {
      if (err instanceof ApiError && err.status === 401) { localStorage.removeItem("comercio_token"); router.replace("/comercio/login") }
    }).finally(() => setLoading(false))
  }, [router])

  const toggleRubro = (r: string) => setForm((f) => ({
    ...f, rubros: f.rubros.includes(r) ? f.rubros.filter((x) => x !== r) : [...f.rubros, r],
  }))

  const handleMapChange = (data: { lat: number; lng: number; direccion?: string; ciudad?: string; provincia?: string }) => {
    setGeoCoords({ lat: data.lat, lng: data.lng })
    setForm((f) => ({ ...f,
      ...(data.direccion ? { direccion: data.direccion } : {}),
      ...(data.ciudad ? { ciudad: data.ciudad } : {}),
      ...(data.provincia ? { provincia: data.provincia } : {}),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.rubros.length === 0) { setError("Seleccioná al menos un tipo de comercio"); return }
    setError(""); setSaving(true); setSuccess(false)
    try {
      const token = localStorage.getItem("comercio_token")!
      await comerciosApi.updateMe(token, {
        ...form,
        ...(geoCoords.lat && geoCoords.lng ? { lat: geoCoords.lat, lng: geoCoords.lng } : {}),
      })
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400 text-sm">Cargando...</div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/comercio/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Mi perfil</span>
          </div>
          <span className="text-sm text-gray-500">{email}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="text-sm text-gray-500 mt-1">Actualizá los datos de tu comercio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">Datos del comercio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                <input value={cuit} disabled className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input value={form.ciudad} onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                <select value={form.provincia} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccioná una provincia</option>
                  {PROVINCIAS_ARGENTINA.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <MapaPicker lat={geoCoords.lat} lng={geoCoords.lng}
            direccion={form.direccion} ciudad={form.ciudad} provincia={form.provincia}
            onChange={handleMapChange} />

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Condición fiscal ante ARCA</h2>
            <p className="text-sm text-gray-400 mb-4">Tu situación impositiva determina cómo se emiten las facturas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tiposImpositivos.map((t) => (
                <button key={t.id} type="button" onClick={() => setForm((f) => ({ ...f, condicion_fiscal: t.nombre }))}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${form.condicion_fiscal === t.nombre ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{t.nombre}</div>
                      {t.descripcion && <div className="text-xs text-gray-500 mt-0.5">{t.descripcion}</div>}
                    </div>
                    {form.condicion_fiscal === t.nombre && <span className="text-blue-600 mt-0.5">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Tipo de comercio *</h2>
            <div className="flex flex-wrap gap-2">
              {RUBROS_DISPONIBLES.map((r) => (
                <button key={r} type="button" onClick={() => toggleRubro(r)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${form.rubros.includes(r) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">✓ Perfil actualizado</div>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/comercio/dashboard")}
              className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
