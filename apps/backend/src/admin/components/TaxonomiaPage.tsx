import { useState, useEffect } from "react"

const API = "/admin/taxonomia"

type Item = { id: string; nombre: string; activo: boolean; rubro_id?: string }
type Rubro = Item
type Subrubro = Item & { rubro_id: string }
type Pasillo = Item
type TipoImpositivo = Item & { descripcion?: string; precio_con_impuestos: boolean }
type AlicuotaIva = { id: string; nombre: string; porcentaje: number; activo: boolean }

type Tab = "rubros" | "subrubros" | "pasillos" | "tipos_impositivos" | "alicuotas"

async function apiFetch(url: string, options?: RequestInit) {
  // En Medusa v2 admin, el token JWT se guarda en localStorage
  const token = typeof window !== "undefined"
    ? (localStorage.getItem("medusa_auth_token") ||
       localStorage.getItem("_medusa_auth_token") ||
       localStorage.getItem("medusa-auth-token") || "")
    : ""

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    credentials: "include",
    ...options,
  })
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`
    try {
      const err = await res.json()
      errMsg = err.error || err.message || errMsg
    } catch {}
    throw new Error(errMsg)
  }
  return res.json()
}

// ---- ItemList: lista genérica con inline edit ----
function ItemList({
  items,
  onToggle,
  onEdit,
  onDelete,
  renderExtra,
}: {
  items: Item[]
  onToggle: (item: Item) => void
  onEdit: (item: Item, nombre: string) => void
  onDelete: (id: string) => void
  renderExtra?: (item: Item) => React.ReactNode
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item) => (
        <div key={item.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
          padding: "10px 14px",
          opacity: item.activo ? 1 : 0.5,
        }}>
          {editingId === item.id ? (
            <>
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onEdit(item, editValue); setEditingId(null) }
                  if (e.key === "Escape") setEditingId(null)
                }}
                style={{ flex: 1, border: "1px solid #3b82f6", borderRadius: 6, padding: "4px 8px", fontSize: 14 }}
              />
              <button onClick={() => { onEdit(item, editValue); setEditingId(null) }}
                style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>
                ✓
              </button>
              <button onClick={() => setEditingId(null)}
                style={{ background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>
                ✕
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 14, color: "#111827", fontWeight: 500 }}>{item.nombre}</span>
              {renderExtra?.(item)}
              <button onClick={() => onToggle(item)}
                style={{
                  background: item.activo ? "#dcfce7" : "#f3f4f6",
                  color: item.activo ? "#16a34a" : "#9ca3af",
                  border: "none", borderRadius: 6, padding: "3px 10px",
                  cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}>
                {item.activo ? "Activo" : "Inactivo"}
              </button>
              <button onClick={() => { setEditingId(item.id); setEditValue(item.nombre) }}
                style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>
                ✏️
              </button>
              <button onClick={() => { if (confirm(`¿Eliminar "${item.nombre}"?`)) onDelete(item.id) }}
                style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>
                🗑️
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ---- Panel de agregar ----
function AddForm({ placeholder, onAdd, extraFields }: {
  placeholder: string
  onAdd: (nombre: string, extra?: any) => void
  extraFields?: React.ReactNode
}) {
  const [value, setValue] = useState("")
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) { onAdd(value); setValue("") } }}
        placeholder={placeholder}
        style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
      />
      {extraFields}
      <button
        onClick={() => { if (value.trim()) { onAdd(value); setValue("") } }}
        style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
      >
        + Agregar
      </button>
    </div>
  )
}

// ---- Tipo Impositivo List ----
function TipoImpositivoList({
  tipos,
  onToggleActivo,
  onTogglePrecio,
  onDelete,
  onEdit,
}: {
  tipos: TipoImpositivo[]
  onToggleActivo: (t: TipoImpositivo) => void
  onTogglePrecio: (t: TipoImpositivo) => void
  onDelete: (id: string) => void
  onEdit: (t: TipoImpositivo, nombre: string, descripcion: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editDesc, setEditDesc] = useState("")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tipos.map((t) => (
        <div key={t.id} style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
          padding: "12px 16px", opacity: t.activo ? 1 : 0.5,
        }}>
          {editingId === t.id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                autoFocus
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                placeholder="Nombre"
                style={{ border: "1px solid #3b82f6", borderRadius: 6, padding: "6px 10px", fontSize: 14 }}
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descripción (opcional)"
                style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { onEdit(t, editNombre, editDesc); setEditingId(null) }}
                  style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
                  Guardar
                </button>
                <button onClick={() => setEditingId(null)}
                  style={{ background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{t.nombre}</div>
                {t.descripcion && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{t.descripcion}</div>
                )}
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => onTogglePrecio(t)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      border: "1px solid", borderRadius: 8, padding: "4px 12px",
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: t.precio_con_impuestos ? "#eff6ff" : "#f0fdf4",
                      borderColor: t.precio_con_impuestos ? "#93c5fd" : "#86efac",
                      color: t.precio_con_impuestos ? "#1d4ed8" : "#15803d",
                    }}
                  >
                    {t.precio_con_impuestos ? "💰 Precio con impuestos incluidos" : "📄 Precio + impuestos separados"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => onToggleActivo(t)}
                  style={{
                    background: t.activo ? "#dcfce7" : "#f3f4f6",
                    color: t.activo ? "#16a34a" : "#9ca3af",
                    border: "none", borderRadius: 6, padding: "3px 10px",
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                  }}>
                  {t.activo ? "Activo" : "Inactivo"}
                </button>
                <button onClick={() => { setEditingId(t.id); setEditNombre(t.nombre); setEditDesc(t.descripcion || "") }}
                  style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>
                  ✏️
                </button>
                <button onClick={() => { if (confirm(`¿Eliminar "${t.nombre}"?`)) onDelete(t.id) }}
                  style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>
                  🗑️
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---- AlicuotaIvaList ----
function AlicuotaIvaList({ alicuotas, onToggle, onEdit, onDelete }: {
  alicuotas: AlicuotaIva[]
  onToggle: (a: AlicuotaIva) => void
  onEdit: (a: AlicuotaIva, nombre: string, porcentaje: number) => void
  onDelete: (id: string) => void
}) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editPorcentaje, setEditPorcentaje] = useState("")

  const startEdit = (a: AlicuotaIva) => {
    setEditId(a.id)
    setEditNombre(a.nombre)
    setEditPorcentaje(String(a.porcentaje))
  }

  const saveEdit = (a: AlicuotaIva) => {
    onEdit(a, editNombre, Number(editPorcentaje))
    setEditId(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {alicuotas.map((a) => (
        <div key={a.id} style={{
          border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px",
          background: a.activo ? "#fff" : "#f9fafb",
          opacity: a.activo ? 1 : 0.6,
        }}>
          {editId === a.id ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                style={{ border: "1px solid #93c5fd", borderRadius: 6, padding: "5px 10px", fontSize: 14, flex: 1, minWidth: 120 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #93c5fd", borderRadius: 6, padding: "5px 10px", background: "#fff" }}>
                <input type="number" value={editPorcentaje} onChange={(e) => setEditPorcentaje(e.target.value)}
                  min="0" max="100" step="0.5"
                  style={{ border: "none", outline: "none", width: 50, fontSize: 14 }} />
                <span style={{ fontSize: 14, color: "#6b7280" }}>%</span>
              </div>
              <button onClick={() => saveEdit(a)}
                style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Guardar
              </button>
              <button onClick={() => setEditId(null)}
                style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8,
                padding: "4px 12px", fontSize: 15, fontWeight: 700, color: "#0369a1", minWidth: 56, textAlign: "center",
              }}>
                {a.porcentaje}%
              </span>
              <span style={{ fontSize: 14, color: "#111827", fontWeight: 500, flex: 1 }}>{a.nombre}</span>
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <button onClick={() => onToggle(a)}
                  style={{
                    fontSize: 12, border: "1px solid", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontWeight: 600,
                    background: a.activo ? "#f0fdf4" : "#f9fafb",
                    borderColor: a.activo ? "#86efac" : "#e5e7eb",
                    color: a.activo ? "#15803d" : "#9ca3af",
                  }}>
                  {a.activo ? "Activo" : "Inactivo"}
                </button>
                <button onClick={() => startEdit(a)}
                  style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 13 }}>
                  ✏️
                </button>
                <button onClick={() => { if (confirm(`¿Eliminar "${a.nombre} (${a.porcentaje}%)"?`)) onDelete(a.id) }}
                  style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 13 }}>
                  🗑️
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---- Componente principal ----
export default function TaxonomiaPage() {
  const [tab, setTab] = useState<Tab>("rubros")
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [subrubros, setSubrubros] = useState<Subrubro[]>([])
  const [pasillos, setPasillos] = useState<Pasillo[]>([])
  const [tipos, setTipos] = useState<TipoImpositivo[]>([])
  const [alicuotas, setAlicuotas] = useState<AlicuotaIva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rubroFiltro, setRubroFiltro] = useState("")
  const [nuevoRubroId, setNuevoRubroId] = useState("")
  const [nuevoTipoDesc, setNuevoTipoDesc] = useState("")
  const [nuevoTipoPrecio, setNuevoTipoPrecio] = useState(true)
  const [nuevoTipoNombre, setNuevoTipoNombre] = useState("")
  const [nuevoAliNombre, setNuevoAliNombre] = useState("")
  const [nuevoAliPorcentaje, setNuevoAliPorcentaje] = useState("")

  const cargar = () => {
    setLoading(true)
    Promise.all([
      apiFetch(`${API}/rubros`),
      apiFetch(`${API}/subrubros`),
      apiFetch(`${API}/pasillos`),
      apiFetch(`${API}/tipos-impositivos`),
      apiFetch(`${API}/alicuotas`),
    ]).then(([r, s, p, ti, ali]) => {
      setRubros(r.rubros)
      setSubrubros(s.subrubros)
      setPasillos(p.pasillos)
      setTipos(ti.tipos)
      setAlicuotas(ali.alicuotas)
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  // --- Rubros ---
  const addRubro = (nombre: string) =>
    apiFetch(`${API}/rubros`, { method: "POST", body: JSON.stringify({ nombre }) })
      .then(cargar).catch((e) => alert(e.message))

  const editRubro = (item: Item, nombre: string) =>
    apiFetch(`${API}/rubros/${item.id}`, { method: "PUT", body: JSON.stringify({ nombre }) })
      .then(cargar).catch((e) => alert(e.message))

  const toggleRubro = (item: Item) =>
    apiFetch(`${API}/rubros/${item.id}`, { method: "PUT", body: JSON.stringify({ activo: !item.activo }) })
      .then(cargar).catch((e) => alert(e.message))

  const deleteRubro = (id: string) =>
    apiFetch(`${API}/rubros/${id}`, { method: "DELETE" })
      .then(cargar).catch((e) => alert(e.message))

  // --- Subrubros ---
  const addSubrubro = (nombre: string) => {
    if (!nuevoRubroId) { alert("Seleccioná un rubro"); return }
    apiFetch(`${API}/subrubros`, { method: "POST", body: JSON.stringify({ nombre, rubro_id: nuevoRubroId }) })
      .then(cargar).catch((e) => alert(e.message))
  }

  const editSubrubro = (item: Item, nombre: string) =>
    apiFetch(`${API}/subrubros/${item.id}`, { method: "PUT", body: JSON.stringify({ nombre }) })
      .then(cargar).catch((e) => alert(e.message))

  const toggleSubrubro = (item: Item) =>
    apiFetch(`${API}/subrubros/${item.id}`, { method: "PUT", body: JSON.stringify({ activo: !item.activo }) })
      .then(cargar).catch((e) => alert(e.message))

  const deleteSubrubro = (id: string) =>
    apiFetch(`${API}/subrubros/${id}`, { method: "DELETE" })
      .then(cargar).catch((e) => alert(e.message))

  // --- Pasillos ---
  const addPasillo = (nombre: string) =>
    apiFetch(`${API}/pasillos`, { method: "POST", body: JSON.stringify({ nombre }) })
      .then(cargar).catch((e) => alert(e.message))

  const editPasillo = (item: Item, nombre: string) =>
    apiFetch(`${API}/pasillos/${item.id}`, { method: "PUT", body: JSON.stringify({ nombre }) })
      .then(cargar).catch((e) => alert(e.message))

  const togglePasillo = (item: Item) =>
    apiFetch(`${API}/pasillos/${item.id}`, { method: "PUT", body: JSON.stringify({ activo: !item.activo }) })
      .then(cargar).catch((e) => alert(e.message))

  const deletePasillo = (id: string) =>
    apiFetch(`${API}/pasillos/${id}`, { method: "DELETE" })
      .then(cargar).catch((e) => alert(e.message))

  // --- Tipos Impositivos ---
  const addTipo = () => {
    if (!nuevoTipoNombre.trim()) return
    apiFetch(`${API}/tipos-impositivos`, {
      method: "POST",
      body: JSON.stringify({
        nombre: nuevoTipoNombre.trim(),
        descripcion: nuevoTipoDesc.trim() || null,
        precio_con_impuestos: nuevoTipoPrecio,
      }),
    }).then(() => { setNuevoTipoNombre(""); setNuevoTipoDesc(""); cargar() })
      .catch((e) => alert(e.message))
  }

  const editTipo = (t: TipoImpositivo, nombre: string, descripcion: string) =>
    apiFetch(`${API}/tipos-impositivos/${t.id}`, {
      method: "PUT", body: JSON.stringify({ nombre, descripcion: descripcion || null }),
    }).then(cargar).catch((e) => alert(e.message))

  const toggleActivoTipo = (t: TipoImpositivo) =>
    apiFetch(`${API}/tipos-impositivos/${t.id}`, {
      method: "PUT", body: JSON.stringify({ activo: !t.activo }),
    }).then(cargar).catch((e) => alert(e.message))

  const togglePrecioTipo = (t: TipoImpositivo) =>
    apiFetch(`${API}/tipos-impositivos/${t.id}`, {
      method: "PUT", body: JSON.stringify({ precio_con_impuestos: !t.precio_con_impuestos }),
    }).then(cargar).catch((e) => alert(e.message))

  const deleteTipo = (id: string) =>
    apiFetch(`${API}/tipos-impositivos/${id}`, { method: "DELETE" })
      .then(cargar).catch((e) => alert(e.message))

  // --- Alícuotas IVA ---
  const addAlicuota = () => {
    if (!nuevoAliNombre.trim()) return alert("Ingresá un nombre")
    if (nuevoAliPorcentaje === "" || isNaN(Number(nuevoAliPorcentaje))) return alert("Ingresá un porcentaje válido")
    apiFetch(`${API}/alicuotas`, {
      method: "POST",
      body: JSON.stringify({ nombre: nuevoAliNombre.trim(), porcentaje: Number(nuevoAliPorcentaje) }),
    }).then(() => { setNuevoAliNombre(""); setNuevoAliPorcentaje(""); cargar() })
      .catch((e) => alert(e.message))
  }

  const editAlicuota = (a: AlicuotaIva, nombre: string, porcentaje: number) =>
    apiFetch(`${API}/alicuotas/${a.id}`, {
      method: "PUT", body: JSON.stringify({ nombre, porcentaje }),
    }).then(cargar).catch((e) => alert(e.message))

  const toggleActivoAlicuota = (a: AlicuotaIva) =>
    apiFetch(`${API}/alicuotas/${a.id}`, {
      method: "PUT", body: JSON.stringify({ activo: !a.activo }),
    }).then(cargar).catch((e) => alert(e.message))

  const deleteAlicuota = (id: string) =>
    apiFetch(`${API}/alicuotas/${id}`, { method: "DELETE" })
      .then(cargar).catch((e) => alert(e.message))

  const subrubrosFiltrados = rubroFiltro
    ? subrubros.filter((s) => s.rubro_id === rubroFiltro)
    : subrubros

  const rubroMap = Object.fromEntries(rubros.map((r) => [r.id, r.nombre]))

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "rubros", label: "Rubros", count: rubros.length },
    { key: "subrubros", label: "Subrubros", count: subrubros.length },
    { key: "pasillos", label: "Pasillos", count: pasillos.length },
    { key: "tipos_impositivos", label: "Tipos impositivos", count: tipos.length },
    { key: "alicuotas", label: "Alícuotas IVA", count: alicuotas.length },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Config. General</h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        Administrá rubros, subrubros, pasillos, condiciones fiscales y alícuotas de IVA.
      </p>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: 20, gap: 0 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 14px", border: "none", background: "none",
            borderBottom: tab === t.key ? "2px solid #111827" : "2px solid transparent",
            color: tab === t.key ? "#111827" : "#6b7280",
            fontWeight: tab === t.key ? 700 : 400,
            cursor: "pointer", fontSize: 13, marginBottom: -2,
          }}>
            {t.label}
            <span style={{ marginLeft: 6, background: "#f3f4f6", borderRadius: 10, padding: "1px 7px", fontSize: 12, color: "#6b7280" }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: 14 }}>Cargando...</p>
      ) : tab === "rubros" ? (
        <>
          <AddForm placeholder="Nuevo rubro..." onAdd={addRubro} />
          {rubros.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 14 }}>Sin rubros todavía.</p>
            : <ItemList items={rubros} onToggle={toggleRubro} onEdit={editRubro} onDelete={deleteRubro} />
          }
        </>
      ) : tab === "subrubros" ? (
        <>
          <AddForm
            placeholder="Nuevo subrubro..."
            onAdd={addSubrubro}
            extraFields={
              <select value={nuevoRubroId} onChange={(e) => setNuevoRubroId(e.target.value)}
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, minWidth: 160 }}>
                <option value="">-- Rubro --</option>
                {rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            }
          />
          <div style={{ marginBottom: 12 }}>
            <select value={rubroFiltro} onChange={(e) => setRubroFiltro(e.target.value)}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "#374151" }}>
              <option value="">Todos los rubros</option>
              {rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          {subrubrosFiltrados.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 14 }}>Sin subrubros.</p>
            : <ItemList
                items={subrubrosFiltrados}
                onToggle={toggleSubrubro}
                onEdit={editSubrubro}
                onDelete={deleteSubrubro}
                renderExtra={(item) => (
                  <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "2px 8px" }}>
                    {rubroMap[(item as Subrubro).rubro_id] || "—"}
                  </span>
                )}
              />
          }
        </>
      ) : tab === "pasillos" ? (
        <>
          <AddForm placeholder="Nuevo pasillo..." onAdd={addPasillo} />
          {pasillos.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 14 }}>Sin pasillos todavía.</p>
            : <ItemList items={pasillos} onToggle={togglePasillo} onEdit={editPasillo} onDelete={deletePasillo} />
          }
        </>
      ) : tab === "tipos_impositivos" ? (
        /* --- Tipos Impositivos --- */
        <>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Definí los tipos de condición fiscal que usan tus mayoristas y comercios, y cómo se muestran los precios en cada caso.
          </p>

          {/* Agregar nuevo */}
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Nuevo tipo impositivo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                value={nuevoTipoNombre}
                onChange={(e) => setNuevoTipoNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTipo() }}
                placeholder="Ej: Responsable Inscripto"
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
              />
              <input
                value={nuevoTipoDesc}
                onChange={(e) => setNuevoTipoDesc(e.target.value)}
                placeholder="Descripción (opcional) — Ej: Emisión de factura A"
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#374151" }}>Precios:</span>
                <button
                  onClick={() => setNuevoTipoPrecio(true)}
                  style={{
                    border: "1px solid", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: nuevoTipoPrecio ? "#eff6ff" : "#f9fafb",
                    borderColor: nuevoTipoPrecio ? "#93c5fd" : "#e5e7eb",
                    color: nuevoTipoPrecio ? "#1d4ed8" : "#6b7280",
                  }}>
                  💰 Con impuestos incluidos
                </button>
                <button
                  onClick={() => setNuevoTipoPrecio(false)}
                  style={{
                    border: "1px solid", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: !nuevoTipoPrecio ? "#f0fdf4" : "#f9fafb",
                    borderColor: !nuevoTipoPrecio ? "#86efac" : "#e5e7eb",
                    color: !nuevoTipoPrecio ? "#15803d" : "#6b7280",
                  }}>
                  📄 Precio + impuestos separados
                </button>
              </div>
              <button
                onClick={addTipo}
                style={{ alignSelf: "flex-start", background: "#111827", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                + Agregar
              </button>
            </div>
          </div>

          {tipos.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 14 }}>Sin tipos configurados. Agregá los que aplican en tu operatoria.</p>
            : <TipoImpositivoList
                tipos={tipos}
                onToggleActivo={toggleActivoTipo}
                onTogglePrecio={togglePrecioTipo}
                onDelete={deleteTipo}
                onEdit={editTipo}
              />
          }
        </>
      ) : (
        /* --- Alícuotas IVA --- */
        <>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Administrá las alícuotas de IVA disponibles para los productos. En Argentina: 0%, 10.5%, 21% y 27%.
          </p>

          {/* Agregar nueva alícuota */}
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Nueva alícuota</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <input
                value={nuevoAliNombre}
                onChange={(e) => setNuevoAliNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addAlicuota() }}
                placeholder="Ej: IVA General"
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, flex: 1, minWidth: 160 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", background: "#fff" }}>
                <input
                  type="number"
                  value={nuevoAliPorcentaje}
                  onChange={(e) => setNuevoAliPorcentaje(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addAlicuota() }}
                  placeholder="21"
                  min="0"
                  max="100"
                  step="0.5"
                  style={{ border: "none", outline: "none", width: 60, fontSize: 14 }}
                />
                <span style={{ fontSize: 14, color: "#6b7280" }}>%</span>
              </div>
              <button
                onClick={addAlicuota}
                style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                + Agregar
              </button>
            </div>
          </div>

          {alicuotas.length === 0
            ? <p style={{ color: "#9ca3af", fontSize: 14 }}>Sin alícuotas configuradas. Agregá IVA 0%, 10.5%, 21% y 27%.</p>
            : <AlicuotaIvaList
                alicuotas={alicuotas}
                onToggle={toggleActivoAlicuota}
                onEdit={editAlicuota}
                onDelete={deleteAlicuota}
              />
          }
        </>
      )}
    </div>
  )
}
