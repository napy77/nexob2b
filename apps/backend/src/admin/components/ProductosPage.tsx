"use client"
import { useState, useEffect } from "react"

const API = "/admin/productos"
const IVA_OPTS = [0, 10.5, 21, 27]

type Presentacion = {
  id?: string
  nombre: string
  factor: number | ""
  unidades_nivel_anterior: number | "" | null
  ean_propio: string
  peso_g: number | "" | null
  largo_mm: number | "" | null
  ancho_mm: number | "" | null
  alto_mm: number | "" | null
  orden: number
}

type Producto = {
  id: string
  ean: string
  nombre: string
  marca: string
  unidad_base: string
  alicuota_iva: number
  estado: string
  imagen_url?: string
  pasillo_nombre?: string
  total_presentaciones: number
  total_mayoristas: number
  presentaciones?: Presentacion[]
}

const EMPTY_PRES = (): Presentacion => ({
  nombre: "", factor: 1, unidades_nivel_anterior: null,
  ean_propio: "", peso_g: null, largo_mm: null, ancho_mm: null, alto_mm: null, orden: 0,
})

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [showPresModal, setShowPresModal] = useState<string | null>(null) // producto_id
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [imagenBase64, setImagenBase64] = useState<string | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)

  // Formulario producto
  const [form, setForm] = useState({
    ean: "", nombre: "", marca: "", descripcion: "",
    unidad_base: "unidad", alicuota_iva: 21,
    pasillo_id: "", rubro_id: "", subrubro_id: "",
  })

  const cargar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (estadoFiltro) params.set("estado", estadoFiltro)
      const res = await fetch(`${API}?${params}`)
      const data = await res.json()
      setProductos(data.productos || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [q, estadoFiltro])

  const cargarPresentaciones = async (producto_id: string) => {
    const res = await fetch(`${API}/${producto_id}`)
    const data = await res.json()
    setPresentaciones(data.producto?.presentaciones || [])
    setShowPresModal(producto_id)
  }

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const b64 = ev.target?.result as string
      setImagenBase64(b64)
      setImagenPreview(b64)
    }
    reader.readAsDataURL(file)
  }

  const guardarProducto = async () => {
    setSaving(true); setError("")
    try {
      const url = editing ? `${API}/${editing.id}` : API
      const method = editing ? "PUT" : "POST"
      const body: any = { ...form }
      if (imagenBase64) body.imagen_url_base64 = imagenBase64
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setShowModal(false); setEditing(null); setImagenBase64(null); setImagenPreview(null)
      cargar()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const aprobar = async (id: string) => {
    await fetch(`${API}/${id}/aprobar`, { method: "PUT" })
    cargar()
  }
  const rechazar = async (id: string) => {
    if (!confirm("¿Rechazar este producto?")) return
    await fetch(`${API}/${id}/rechazar`, { method: "PUT" })
    cargar()
  }
  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este producto del catálogo maestro?")) return
    await fetch(`${API}/${id}`, { method: "DELETE" })
    cargar()
  }

  const guardarPresentacion = async (p: Presentacion) => {
    if (!showPresModal) return
    setSaving(true)
    try {
      const body = {
        ...p,
        factor: p.factor === "" ? 1 : p.factor,
        unidades_nivel_anterior: p.unidades_nivel_anterior === "" ? null : p.unidades_nivel_anterior,
        peso_g: p.peso_g === "" ? null : p.peso_g,
        largo_mm: p.largo_mm === "" ? null : p.largo_mm,
        ancho_mm: p.ancho_mm === "" ? null : p.ancho_mm,
        alto_mm: p.alto_mm === "" ? null : p.alto_mm,
      }
      if (p.id) {
        await fetch(`${API}/${showPresModal}/presentaciones/${p.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
      } else {
        await fetch(`${API}/${showPresModal}/presentaciones`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        })
      }
      cargarPresentaciones(showPresModal)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const eliminarPresentacion = async (pid: string) => {
    if (!showPresModal || !confirm("¿Eliminar presentación?")) return
    await fetch(`${API}/${showPresModal}/presentaciones/${pid}`, { method: "DELETE" })
    cargarPresentaciones(showPresModal)
  }

  const abrirCrear = () => {
    setEditing(null)
    setForm({ ean: "", nombre: "", marca: "", descripcion: "", unidad_base: "unidad", alicuota_iva: 21, pasillo_id: "", rubro_id: "", subrubro_id: "" })
    setImagenBase64(null); setImagenPreview(null)
    setShowModal(true)
  }
  const abrirEditar = async (p: Producto) => {
    const res = await fetch(`${API}/${p.id}`)
    const data = await res.json()
    const prod = data.producto
    setEditing(prod)
    setForm({
      ean: prod.ean || "", nombre: prod.nombre, marca: prod.marca || "",
      descripcion: prod.descripcion || "", unidad_base: prod.unidad_base || "unidad",
      alicuota_iva: prod.alicuota_iva || 21, pasillo_id: prod.pasillo_id || "",
      rubro_id: prod.rubro_id || "", subrubro_id: prod.subrubro_id || "",
    })
    setImagenBase64(null)
    setImagenPreview(prod.imagen_url || null)
    setShowModal(true)
  }

  const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
    aprobado: { label: "Aprobado", color: "#065f46" },
    pendiente: { label: "Pendiente", color: "#92400e" },
    rechazado: { label: "Rechazado", color: "#991b1b" },
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📦 Catálogo maestro de productos</h1>
        <button onClick={abrirCrear}
          style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer" }}>
          + Nuevo producto
        </button>
      </div>

      {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>{error}</div>}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input placeholder="Buscar por nombre, EAN, marca..." value={q} onChange={e => setQ(e.target.value)}
          style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14 }} />
        <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}
          style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}>
          <option value="">Todos los estados</option>
          <option value="aprobado">Aprobados</option>
          <option value="pendiente">Pendientes</option>
          <option value="rechazado">Rechazados</option>
        </select>
      </div>

      {/* Tabla */}
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Cargando...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
              {["", "EAN", "Nombre", "Marca", "Unidad base", "IVA", "Estado", "Presentaciones", "Mayoristas", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productos.map(p => {
              const badge = ESTADO_BADGE[p.estado] || { label: p.estado, color: "#374151" }
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 12px", width: 48 }}>
                    {p.imagen_url
                      ? <img src={p.imagen_url!} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }} />
                      : <div style={{ width: 40, height: 40, background: "#f3f4f6", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
                    }
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{p.ean}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{p.nombre}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{p.marca || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{p.unidad_base}</td>
                  <td style={{ padding: "10px 12px" }}>{p.alicuota_iva}%</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: `${badge.color}20`, color: badge.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button onClick={() => cargarPresentaciones(p.id)}
                      style={{ background: "#ede9fe", color: "#6d28d9", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      {p.total_presentaciones} 📐
                    </button>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#6b7280" }}>{p.total_mayoristas}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => abrirEditar(p)}
                        style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>
                      {p.estado === "pendiente" && (
                        <>
                          <button onClick={() => aprobar(p.id)}
                            style={{ background: "#d1fae5", color: "#065f46", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✓ Aprobar</button>
                          <button onClick={() => rechazar(p.id)}
                            style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✗</button>
                        </>
                      )}
                      <button onClick={() => eliminar(p.id)}
                        style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Modal crear/editar producto */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editing ? "Editar producto" : "Nuevo producto maestro"}</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                  EAN <span style={{ color: "#6b7280", fontWeight: 400 }}>(se genera NXB-xxx si vacío)</span>
                  <input value={form.ean} onChange={e => setForm(f => ({ ...f, ean: e.target.value }))}
                    placeholder="7790123456789"
                    style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 14, boxSizing: "border-box" }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                  Marca
                  <input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                    style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 14, boxSizing: "border-box" }} />
                </label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Nombre *
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 14, boxSizing: "border-box" }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Descripción
                <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2}
                  style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
              </label>
              {/* Imagen */}
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Foto del producto
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
                  {imagenPreview
                    ? <img src={imagenPreview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    : <div style={{ width: 72, height: 72, background: "#f9fafb", borderRadius: 8, border: "1px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📦</div>
                  }
                  <div>
                    <input type="file" accept="image/*" onChange={handleImagenChange} id="img-upload" style={{ display: "none" }} />
                    <label htmlFor="img-upload"
                      style={{ display: "inline-block", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                      {imagenPreview ? "Cambiar foto" : "Subir foto"}
                    </label>
                    {imagenPreview && (
                      <button onClick={() => { setImagenBase64(null); setImagenPreview(null) }}
                        style={{ display: "block", marginTop: 6, background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", padding: 0 }}>
                        Quitar foto
                      </button>
                    )}
                  </div>
                </div>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                  Unidad base
                  <input value={form.unidad_base} onChange={e => setForm(f => ({ ...f, unidad_base: e.target.value }))}
                    placeholder="unidad, kg, litro..."
                    style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 14, boxSizing: "border-box" }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                  Alícuota IVA
                  <select value={form.alicuota_iva} onChange={e => setForm(f => ({ ...f, alicuota_iva: parseFloat(e.target.value) }))}
                    style={{ display: "block", width: "100%", marginTop: 4, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 14, boxSizing: "border-box" }}>
                    {IVA_OPTS.map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </label>
              </div>
            </div>
            {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowModal(false); setError("") }}
                style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarProducto} disabled={saving || !form.nombre}
                style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal presentaciones */}
      {showPresModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 700, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📐 Presentaciones del producto</h2>
              <button onClick={() => setShowPresModal(null)}
                style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>

            {/* Tabla de presentaciones */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Nombre", "Factor", "Niv. ant.", "EAN propio", "Peso (g)", "L×A×H (mm)", "Orden", ""].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {presentaciones.map(p => (
                  <PresentacionRow key={p.id} p={p} onSave={guardarPresentacion} onDelete={() => p.id && eliminarPresentacion(p.id)} />
                ))}
              </tbody>
            </table>

            {/* Agregar nueva */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#374151" }}>+ Agregar presentación</p>
              <NuevaPresentacionForm onSave={guardarPresentacion} saving={saving} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PresentacionRow({ p, onSave, onDelete }: { p: Presentacion; onSave: (p: Presentacion) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Presentacion>({ ...p })

  if (!editing) return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{p.nombre}</td>
      <td style={{ padding: "8px 10px" }}>×{p.factor}</td>
      <td style={{ padding: "8px 10px", color: "#9ca3af" }}>{p.unidades_nivel_anterior ?? "—"}</td>
      <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#6b7280", fontSize: 11 }}>{p.ean_propio || "—"}</td>
      <td style={{ padding: "8px 10px", color: "#6b7280" }}>{p.peso_g ?? "—"}</td>
      <td style={{ padding: "8px 10px", color: "#6b7280" }}>{p.largo_mm ? `${p.largo_mm}×${p.ancho_mm}×${p.alto_mm}` : "—"}</td>
      <td style={{ padding: "8px 10px", color: "#9ca3af" }}>{p.orden}</td>
      <td style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setEditing(true)}
            style={{ background: "#f3f4f6", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>✏️</button>
          <button onClick={onDelete}
            style={{ background: "#fee2e2", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>🗑️</button>
        </div>
      </td>
    </tr>
  )

  return (
    <tr style={{ background: "#eff6ff", borderBottom: "1px solid #dbeafe" }}>
      <td style={{ padding: "6px 8px" }}><input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={cellInput} /></td>
      <td style={{ padding: "6px 8px" }}><input type="number" value={form.factor} onChange={e => setForm(f => ({ ...f, factor: e.target.value === "" ? "" : parseFloat(e.target.value) }))} style={{ ...cellInput, width: 60 }} /></td>
      <td style={{ padding: "6px 8px" }}><input type="number" value={form.unidades_nivel_anterior ?? ""} onChange={e => setForm(f => ({ ...f, unidades_nivel_anterior: e.target.value === "" ? null : parseFloat(e.target.value) }))} style={{ ...cellInput, width: 60 }} /></td>
      <td style={{ padding: "6px 8px" }}><input value={form.ean_propio || ""} onChange={e => setForm(f => ({ ...f, ean_propio: e.target.value }))} style={{ ...cellInput, width: 110 }} /></td>
      <td style={{ padding: "6px 8px" }}><input type="number" value={form.peso_g ?? ""} onChange={e => setForm(f => ({ ...f, peso_g: e.target.value === "" ? null : parseFloat(e.target.value) }))} style={{ ...cellInput, width: 70 }} /></td>
      <td style={{ padding: "6px 8px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <input type="number" placeholder="L" value={form.largo_mm ?? ""} onChange={e => setForm(f => ({ ...f, largo_mm: e.target.value === "" ? null : parseFloat(e.target.value) }))} style={{ ...cellInput, width: 50 }} />
          <input type="number" placeholder="A" value={form.ancho_mm ?? ""} onChange={e => setForm(f => ({ ...f, ancho_mm: e.target.value === "" ? null : parseFloat(e.target.value) }))} style={{ ...cellInput, width: 50 }} />
          <input type="number" placeholder="H" value={form.alto_mm ?? ""} onChange={e => setForm(f => ({ ...f, alto_mm: e.target.value === "" ? null : parseFloat(e.target.value) }))} style={{ ...cellInput, width: 50 }} />
        </div>
      </td>
      <td style={{ padding: "6px 8px" }}><input type="number" value={form.orden} onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))} style={{ ...cellInput, width: 50 }} /></td>
      <td style={{ padding: "6px 8px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => { onSave(form); setEditing(false) }}
            style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>✓</button>
          <button onClick={() => setEditing(false)}
            style={{ background: "#f3f4f6", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>✕</button>
        </div>
      </td>
    </tr>
  )
}

const cellInput: React.CSSProperties = {
  border: "1px solid #dbeafe", borderRadius: 4, padding: "4px 6px", fontSize: 12, width: "100%", boxSizing: "border-box",
}

function NuevaPresentacionForm({ onSave, saving }: { onSave: (p: Presentacion) => void; saving: boolean }) {
  const [form, setForm] = useState<Presentacion>(EMPTY_PRES())

  const handleSave = () => {
    if (!form.nombre) return
    onSave(form)
    setForm(EMPTY_PRES())
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 80px", gap: 6, alignItems: "end" }}>
      {[
        { label: "Nombre *", field: "nombre", placeholder: "Pack x12" },
        { label: "Factor", field: "factor", type: "number", placeholder: "12" },
        { label: "Niv. ant.", field: "unidades_nivel_anterior", type: "number", placeholder: "12" },
        { label: "EAN propio", field: "ean_propio", placeholder: "" },
        { label: "Peso (g)", field: "peso_g", type: "number", placeholder: "520" },
        { label: "Largo mm", field: "largo_mm", type: "number", placeholder: "280" },
        { label: "Ancho mm", field: "ancho_mm", type: "number", placeholder: "95" },
        { label: "Alto mm", field: "alto_mm", type: "number", placeholder: "60" },
      ].map(({ label, field, type, placeholder }) => (
        <label key={field} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
          {label}
          <input
            type={type || "text"}
            placeholder={placeholder}
            value={(form as any)[field] ?? ""}
            onChange={e => setForm(f => ({ ...f, [field]: type === "number" ? (e.target.value === "" ? null : parseFloat(e.target.value)) : e.target.value }))}
            style={{ display: "block", width: "100%", marginTop: 2, border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 8px", fontSize: 12, boxSizing: "border-box" }}
          />
        </label>
      ))}
      <button onClick={handleSave} disabled={saving || !form.nombre}
        style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 600, cursor: "pointer", marginTop: 16, opacity: saving ? 0.7 : 1 }}>
        Agregar
      </button>
    </div>
  )
}
