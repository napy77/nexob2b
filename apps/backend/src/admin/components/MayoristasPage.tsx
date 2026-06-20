import React from "react"

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

export default class MayoristasPage extends React.Component<Record<string, never>, State> {
  state: State = { mayoristas: [], loading: true, updating: null }

  componentDidMount() {
    this.cargarMayoristas()
  }

  cargarMayoristas() {
    fetch("/admin/mayoristas", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => this.setState({ mayoristas: d.mayoristas || [], loading: false }))
      .catch(() => this.setState({ loading: false }))
  }

  cambiarEstado(id: string, estado: string) {
    this.setState({ updating: id })
    fetch(`/admin/mayoristas/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
      .then(() => this.cargarMayoristas())
      .then(() => this.setState({ updating: null }))
  }

  render() {
    const { mayoristas, loading, updating } = this.state

    if (loading) return <div className="p-6 text-sm text-gray-500">Cargando...</div>

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Mayoristas</h1>
          <span className="text-sm text-gray-500">{mayoristas.length} registrados</span>
        </div>

        {mayoristas.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay mayoristas registrados todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 font-medium text-gray-600 pr-4">Empresa</th>
                  <th className="pb-3 font-medium text-gray-600 pr-4">CUIT</th>
                  <th className="pb-3 font-medium text-gray-600 pr-4">Email</th>
                  <th className="pb-3 font-medium text-gray-600 pr-4">Ubicación</th>
                  <th className="pb-3 font-medium text-gray-600 pr-4">Estado</th>
                  <th className="pb-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mayoristas.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900">{m.nombre}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{m.rubros?.join(", ")}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{m.cuit}</td>
                    <td className="py-3 pr-4 text-gray-700">{m.email}</td>
                    <td className="py-3 pr-4 text-gray-700">
                      {m.ciudad && m.provincia ? `${m.ciudad}, ${m.provincia}` : m.provincia || m.ciudad || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.estado === "aprobado" ? "bg-green-100 text-green-700" :
                        m.estado === "suspendido" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {m.estado}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {m.estado !== "aprobado" && (
                          <button
                            disabled={updating === m.id}
                            onClick={() => this.cambiarEstado(m.id, "aprobado")}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                        )}
                        {m.estado !== "suspendido" && (
                          <button
                            disabled={updating === m.id}
                            onClick={() => this.cambiarEstado(m.id, "suspendido")}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Suspender
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }
}
