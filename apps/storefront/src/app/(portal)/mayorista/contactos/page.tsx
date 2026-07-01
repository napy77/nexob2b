"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { mayoristasApi, ApiError } from "../../../../lib/mayorista/api"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type Comercio = {
  id: string
  nombre: string
  cuit: string
  email: string
  telefono?: string
  ciudad?: string
  provincia?: string
  rubros: string[]
}

type Contacto = {
  id: string
  comercio_id: string
  mayorista_id: string
  estado: "pendiente" | "aceptado" | "rechazado"
  mensaje?: string
  vendedor_id: string | null
  lista_precio_id: string | null
  created_at: string
  comercio: Comercio | null
}

type ListaPrecio = {
  id: string
  nombre: string
  descuento_porcentaje: number
}

type Vendedor = {
  id: string
  nombre: string
  apellido: string
  email: string | null
  celular: string | null
  activo: boolean
}

const TABS = [
  { key: "pendiente", label: "Pendientes" },
  { key: "aceptado",  label: "Aceptados"  },
  { key: "rechazado", label: "Rechazados" },
]

export default function MayoristaContactosPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"pendiente" | "aceptado" | "rechazado">("pendiente")
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [asignando, setAsignando] = useState<string | null>(null)
  const [listas, setListas] = useState<ListaPrecio[]>([])
  const [asignandoLista, setAsignandoLista] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [expandedMedios, setExpandedMedios] = useState<string | null>(null) // comercio_id expandido
  const [mediosContacto, setMediosContacto] = useState<Record<string, any[]>>({}) // comercio_id → medios
  const [togglingMedio, setTogglingMedio] = useState<string | null>(null) // medio_pago_id

  const token = () => localStorage.getItem("mayorista_token") || ""

  const headers = (ct = true) => ({
    ...(ct ? { "Content-Type": "application/json" } : {}),
    "Authorization": `Bearer ${token()}`,
    "x-publishable-api-key": PUB_KEY,
  })

  const cargar = () => {
    const t = token()
    if (!t) { router.replace("/mayorista/login"); return }
    setLoading(true)
    mayoristasApi.getContactos(t, tab)
      .then((data) => setContactos(data.contactos))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("mayorista_token"); router.replace("/mayorista/login")
        } else setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  const cargarVendedores = async () => {
    const t = token()
    if (!t) return
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/vendedores`, { headers: headers(false) })
      const data = await res.json()
      setVendedores((data.vendedores || []).filter((v: Vendedor) => v.activo))
    } catch {}
  }

  const cargarListas = async () => {
    const t = token()
    if (!t) return
    try {
      const res = await fetch(`${BACKEND_URL}/store/mayoristas/me/listas-precio`, { headers: headers(false) })
      const data = await res.json()
      setListas(data.listas || [])
    } catch {}
  }

  useEffect(() => { cargar() }, [tab])
  useEffect(() => { cargarVendedores(); cargarListas() }, [])

  const handleAccion = async (solicitudId: string, estado: "aceptado" | "rechazado") => {
    setAccionando(solicitudId)
    try {
      await mayoristasApi.actualizarContacto(token(), solicitudId, estado)
      cargar()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAccionando(null)
    }
  }

  const asignarVendedor = async (solicitudId: string, vendedorId: string | null) => {
    setAsignando(solicitudId)
    try {
      await fetch(`${BACKEND_URL}/store/mayoristas/contactos/${solicitudId}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ vendedor_id: vendedorId }),
      })
      // Actualizar local sin recargar todo
      setContactos((prev) =>
        prev.map((c) => c.id === solicitudId ? { ...c, vendedor_id: vendedorId } : c)
      )
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAsignando(null)
    }
  }

  const asignarLista = async (solicitudId: string, comercioId: string, listaPrecioId: string | null) => {
    setAsignandoLista(solicitudId)
    try {
      await fetch(`${BACKEND_URL}/store/mayoristas/me/contactos/${comercioId}/lista-precio`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ lista_precio_id: listaPrecioId }),
      })
      setContactos((prev) =>
        prev.map((c) => c.id === solicitudId ? { ...c, lista_precio_id: listaPrecioId } : c)
      )
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAsignandoLista(null)
    }
  }

  const cargarMediosContacto = async (comercioId: string) => {
    if (mediosContacto[comercioId]) {
      setExpandedMedios(expandedMedios === comercioId ? null : comercioId)
      return
    }
    try {
      const res = await fetch(
        `${BACKEND_URL}/store/mayoristas/me/contactos/${comercioId}/medios-pago`,
        { headers: headers(false) }
      )
      const data = await res.json()
      setMediosContacto(prev => ({ ...prev, [comercioId]: data.medios_pago || [] }))
      setExpandedMedios(comercioId)
    } catch {}
  }

  const toggleMedioContacto = async (comercioId: string, medioPagoId: string, habilitadoActual: boolean) => {
    setTogglingMedio(medioPagoId)
    try {
      const res = await fetch(
        `${BACKEND_URL}/store/mayoristas/me/contactos/${comercioId}/medios-pago`,
        {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify({ medio_pago_id: medioPagoId, habilitado: !habilitadoActual }),
        }
      )
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setMediosContacto(prev => ({
        ...prev,
        [comercioId]: prev[comercioId].map(m =>
          m.id === medioPagoId ? { ...m, habilitado: !habilitadoActual } : m
        ),
      }))
    } catch (e: any) { alert(e.message) }
    finally { setTogglingMedio(null) }
  }

  const pendientes = contactos.filter((c) => c.estado === "pendiente").length

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/mayorista/dashboard")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xl font-bold text-gray-900">Nexo B2B</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Contactos</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Aviso de vendedores disponibles */}
        {vendedores.length > 0 && tab === "aceptado" && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 mb-4 flex items-center gap-2">
            <span>🧑‍💼</span>
            <span>Tenés <strong>{vendedores.length} vendedor{vendedores.length !== 1 ? "es" : ""}</strong> activo{vendedores.length !== 1 ? "s" : ""}. Podés asignarlos a cada comercio usando el selector.</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
              {t.key === "pendiente" && pendientes > 0 && tab !== "pendiente" && (
                <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                  {pendientes}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
        ) : contactos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-4">
              {tab === "pendiente" ? "⏳" : tab === "aceptado" ? "✅" : "❌"}
            </div>
            <p className="text-gray-500 text-sm">
              {tab === "pendiente" && "No hay solicitudes pendientes."}
              {tab === "aceptado" && "No hay comercios aceptados aún."}
              {tab === "rechazado" && "No hay solicitudes rechazadas."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contactos.map((c) => {
              const comercio = c.comercio
              const vendedorAsignado = vendedores.find((v) => v.id === c.vendedor_id) || null

              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{comercio?.nombre || "Comercio desconocido"}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">CUIT: {comercio?.cuit}</p>
                      <p className="text-sm text-gray-500">
                        {[comercio?.ciudad, comercio?.provincia].filter(Boolean).join(", ")}
                      </p>
                      {comercio?.rubros?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {comercio.rubros.map((r) => (
                            <span key={r} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{r}</span>
                          ))}
                        </div>
                      )}
                      {c.mensaje && (
                        <p className="text-sm text-gray-400 mt-2 italic">"{c.mensaje}"</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-gray-400">
                        {comercio?.email && <span>{comercio.email}</span>}
                        {comercio?.telefono && <span>{comercio.telefono}</span>}
                      </div>

                      {/* Selector de vendedor — solo para aceptados */}
                      {tab === "aceptado" && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500 flex-shrink-0">Vendedor asignado:</span>
                          {vendedores.length === 0 ? (
                            <a href="/mayorista/vendedores"
                              className="text-xs text-blue-600 hover:underline">
                              + Agregar vendedores
                            </a>
                          ) : (
                            <select
                              value={c.vendedor_id || ""}
                              disabled={asignando === c.id}
                              onChange={(e) => asignarVendedor(c.id, e.target.value || null)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white min-w-0 flex-1 max-w-xs">
                              <option value="">— Sin asignar (contacto del perfil) —</option>
                              {vendedores.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.nombre} {v.apellido}{v.celular ? ` · ${v.celular}` : ""}
                                </option>
                              ))}
                            </select>
                          )}
                          {asignando === c.id && (
                            <span className="text-xs text-gray-400">Guardando...</span>
                          )}
                          {vendedorAsignado && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
                              🧑‍💼 asignado
                            </span>
                          )}
                        </div>
                      )}

                      {/* Selector de lista de precios — solo para aceptados */}
                      {tab === "aceptado" && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500 flex-shrink-0">Lista de precios:</span>
                          {listas.length === 0 ? (
                            <a href="/mayorista/listas-precio"
                              className="text-xs text-blue-600 hover:underline">
                              + Crear lista de precios
                            </a>
                          ) : (
                            <select
                              value={c.lista_precio_id || ""}
                              disabled={asignandoLista === c.id}
                              onChange={(e) => asignarLista(c.id, c.comercio_id, e.target.value || null)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white min-w-0 flex-1 max-w-xs">
                              <option value="">— Precio de lista —</option>
                              {listas.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.nombre}{l.descuento_porcentaje > 0 ? ` (−${l.descuento_porcentaje}%)` : ""}
                                </option>
                              ))}
                            </select>
                          )}
                          {asignandoLista === c.id && (
                            <span className="text-xs text-gray-400">Guardando...</span>
                          )}
                          {c.lista_precio_id && asignandoLista !== c.id && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full flex-shrink-0">
                              🏷️ asignada
                            </span>
                          )}
                        </div>
                      )}

                    {/* Panel medios de pago — solo aceptados */}
                      {tab === "aceptado" && c.comercio && (
                        <div className="mt-3">
                          <button
                            onClick={() => cargarMediosContacto(c.comercio_id)}
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
                          >
                            <span>💳</span>
                            <span>Medios de pago para este contacto</span>
                            <span className="text-gray-400">{expandedMedios === c.comercio_id ? "▲" : "▼"}</span>
                          </button>

                          {expandedMedios === c.comercio_id && mediosContacto[c.comercio_id] && (
                            <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                              {mediosContacto[c.comercio_id].map((m: any) => {
                                const deshabilitadoGlobal = !m.habilitado_global
                                const isToggling = togglingMedio === m.id
                                return (
                                  <div key={m.id}
                                    className={`flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 ${deshabilitadoGlobal ? "opacity-40 bg-gray-50" : "bg-white"}`}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">{m.icono || "💳"}</span>
                                      <div>
                                        <p className="text-xs font-medium text-gray-800">{m.nombre}</p>
                                        {deshabilitadoGlobal && (
                                          <p className="text-xs text-gray-400">Deshabilitado globalmente</p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      disabled={deshabilitadoGlobal || isToggling}
                                      onClick={() => !deshabilitadoGlobal && toggleMedioContacto(c.comercio_id, m.id, m.habilitado)}
                                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                                        deshabilitadoGlobal
                                          ? "bg-gray-200 cursor-not-allowed"
                                          : m.habilitado
                                            ? "bg-green-500 cursor-pointer"
                                            : "bg-gray-200 cursor-pointer"
                                      } ${isToggling ? "opacity-50" : ""}`}
                                    >
                                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${m.habilitado && !deshabilitadoGlobal ? "translate-x-4" : "translate-x-0"}`} />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Acciones por tab */}
                    {tab === "pendiente" && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => handleAccion(c.id, "aceptado")} disabled={accionando === c.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
                          Aceptar
                        </button>
                        <button onClick={() => handleAccion(c.id, "rechazado")} disabled={accionando === c.id}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60">
                          Rechazar
                        </button>
                      </div>
                    )}

                    {tab === "aceptado" && comercio && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {(vendedorAsignado?.celular || comercio.telefono) && (
                          <a href={`https://wa.me/${(vendedorAsignado?.celular || comercio.telefono || "").replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors text-center">
                            WhatsApp
                          </a>
                        )}
                        <a href={`mailto:${vendedorAsignado?.email || comercio.email}`}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-center">
                          Email
                        </a>
                        <button onClick={() => handleAccion(c.id, "rechazado")} disabled={accionando === c.id}
                          className="px-4 py-2 border border-red-100 text-red-500 rounded-xl text-xs font-medium hover:bg-red-50 transition-colors">
                          Revocar acceso
                        </button>
                      </div>
                    )}

                    {tab === "rechazado" && (
                      <button onClick={() => handleAccion(c.id, "aceptado")} disabled={accionando === c.id}
                        className="px-4 py-2 border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors flex-shrink-0">
                        Aceptar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
