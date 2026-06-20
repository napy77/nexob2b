import { Component } from "react"

type Comercio = {
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
  comercios: Comercio[]
  loading: boolean
  updating: string | null
}

export default class ComerciosPage extends Component<Record<string, never>, State> {
  override state: State = { comercios: [], loading: true, updating: null }

  override componentDidMount() {
    this.cargar()
  }

  cargar() {
    fetch("/admin/comercios", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => this.setState({ comercios: d.comercios || [], loading: false }))
      .catch(() => this.setState({ loading: false }))
  }

  aprobar(id: string) {
    this.setState({ updating: id })
    fetch(`/admin/comercios/${id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "aprobado" }),
    }).then(() => { this.cargar(); this.setState({ updating: null }) })
  }

  suspender(id: string) {
    this.setState({ updating: id })
    fetch(`/admin/comercios/${id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "suspendido" }),
    }).then(() => { this.cargar(); this.setState({ updating: null }) })
  }

  override render() {
    const { comercios, loading, updating } = this.state
    if (loading) return <div style={{ padding: 24, color: "#888" }}>Cargando...</div>

    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Comercios</h1>
          <span style={{ color: "#888", fontSize: 13 }}>{comercios.length} registrados</span>
        </div>
        {comercios.length === 0 ? (
          <p style={{ color: "#888" }}>No hay comercios registrados todavía.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                {["Comercio", "CUIT", "Email", "Ubicación", "Estado", "Acciones"].map((h) => (
                  <th key={h} style={{ textAlign: "left", paddingBottom: 8, paddingRight: 16, fontWeight: 500, color: "#555" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comercios.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 16px 10px 0" }}>
                    <div style={{ fontWeight: 500 }}>{c.nombre}</div>
                    <div style={{ color: "#999", fontSize: 11 }}>{c.rubros?.join(", ")}</div>
                  </td>
                  <td style={{ paddingRight: 16 }}>{c.cuit}</td>
                  <td style={{ paddingRight: 16 }}>{c.email}</td>
                  <td style={{ paddingRight: 16 }}>
                    {c.ciudad && c.provincia ? `${c.ciudad}, ${c.provincia}` : c.provincia || c.ciudad || "—"}
                  </td>
                  <td style={{ paddingRight: 16 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500,
                      background: c.estado === "aprobado" ? "#dcfce7" : c.estado === "suspendido" ? "#fee2e2" : "#fef9c3",
                      color: c.estado === "aprobado" ? "#166534" : c.estado === "suspendido" ? "#991b1b" : "#854d0e",
                    }}>
                      {c.estado}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {c.estado !== "aprobado" && (
                        <button disabled={updating === c.id} onClick={() => this.aprobar(c.id)}
                          style={{ padding: "4px 10px", fontSize: 12, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: updating === c.id ? 0.5 : 1 }}>
                          Aprobar
                        </button>
                      )}
                      {c.estado !== "suspendido" && (
                        <button disabled={updating === c.id} onClick={() => this.suspender(c.id)}
                          style={{ padding: "4px 10px", fontSize: 12, background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: updating === c.id ? 0.5 : 1 }}>
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
