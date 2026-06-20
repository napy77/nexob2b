import { Component } from "react"

type Mayorista = {
  id: string
  nombre: string
  email: string
  cuit: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  estado: string
}

type State = {
  mayoristas: Mayorista[]
  loading: boolean
  updating: string | null
}

export default class MayoristasPage extends Component<Record<string, never>, State> {
  override state: State = { mayoristas: [], loading: true, updating: null }

  override componentDidMount() {
    this.cargar()
  }

  cargar() {
    fetch("/admin/mayoristas", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => this.setState({ mayoristas: d.mayoristas || [], loading: false }))
      .catch(() => this.setState({ loading: false }))
  }

  aprobar(id: string) {
    this.setState({ updating: id })
    fetch(`/admin/mayoristas/${id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "aprobado" }),
    }).then(() => { this.cargar(); this.setState({ updating: null }) })
  }

  suspender(id: string) {
    this.setState({ updating: id })
    fetch(`/admin/mayoristas/${id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "suspendido" }),
    }).then(() => { this.cargar(); this.setState({ updating: null }) })
  }

  override render() {
    const { mayoristas, loading, updating } = this.state
    if (loading) return <div style={{ padding: 24, color: "#888" }}>Cargando...</div>

    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Mayoristas</h1>
          <span style={{ color: "#888", fontSize: 13 }}>{mayoristas.length} registrados</span>
        </div>
        {mayoristas.length === 0 ? (
          <p style={{ color: "#888" }}>No hay mayoristas registrados todavía.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                {["Empresa", "CUIT", "Email", "Ubicación", "Estado", "Acciones"].map((h) => (
                  <th key={h} style={{ textAlign: "left", paddingBottom: 8, paddingRight: 16, fontWeight: 500, color: "#555" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mayoristas.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 16px 10px 0" }}>
                    <div style={{ fontWeight: 500 }}>{m.nombre}</div>
                    <div style={{ color: "#999", fontSize: 11 }}>{m.rubros?.join(", ")}</div>
                  </td>
                  <td style={{ paddingRight: 16 }}>{m.cuit}</td>
                  <td style={{ paddingRight: 16 }}>{m.email}</td>
                  <td style={{ paddingRight: 16 }}>
                    {m.ciudad && m.provincia ? `${m.ciudad}, ${m.provincia}` : m.provincia || m.ciudad || "—"}
                  </td>
                  <td style={{ paddingRight: 16 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500,
                      background: m.estado === "aprobado" ? "#dcfce7" : m.estado === "suspendido" ? "#fee2e2" : "#fef9c3",
                      color: m.estado === "aprobado" ? "#166534" : m.estado === "suspendido" ? "#991b1b" : "#854d0e",
                    }}>
                      {m.estado}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {m.estado !== "aprobado" && (
                        <button disabled={updating === m.id} onClick={() => this.aprobar(m.id)}
                          style={{ padding: "4px 10px", fontSize: 12, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: updating === m.id ? 0.5 : 1 }}>
                          Aprobar
                        </button>
                      )}
                      {m.estado !== "suspendido" && (
                        <button disabled={updating === m.id} onClick={() => this.suspender(m.id)}
                          style={{ padding: "4px 10px", fontSize: 12, background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: updating === m.id ? 0.5 : 1 }}>
                          Suspender
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }
}
