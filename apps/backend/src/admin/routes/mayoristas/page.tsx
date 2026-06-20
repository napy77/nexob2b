import { defineRouteConfig } from "@medusajs/admin-sdk"
import React, { useState, useEffect } from "react"

export const config = defineRouteConfig({
  label: "Mayoristas",
})

type Mayorista = {
  id: string
  nombre: string
  email: string
  cuit: string
  ciudad?: string
  provincia?: string
  rubros: string[]
  estado: "pendiente" | "aprobado" | "suspendido"
}

function MayoristasPage() {
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchMayoristas() {
    const res = await fetch("/admin/mayoristas", { credentials: "include" })
    const data = await res.json()
    setMayoristas(data.mayoristas || [])
    setLoading(false)
  }

  useEffect(() => { fetchMayoristas() }, [])

  async function cambiarEstado(id: string, estado: string) {
    setUpdating(id)
    await fetch(`/admin/mayoristas/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    await fetchMayoristas()
    setUpdating(null)
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mayoristas</h1>
        <span className="text-sm text-gray-500">{mayoristas.length} registrados</span>
      </div>

      {mayoristas.length === 0 ? (
        <p className="text-gray-500">No hay mayoristas registrados todavía.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Empresa</th>
              <th className="pb-2 font-medium">CUIT</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Ubicación</th>
              <th className="pb-2 font-medium">Estado</th>
              <th className="pb-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mayoristas.map((m) => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="py-3">
                  <div className="font-medium">{m.nombre}</div>
                  <div className="text-xs text-gray-400">{m.rubros?.join(", ")}</div>
                </td>
                <td className="py-3">{m.cuit}</td>
                <td className="py-3">{m.email}</td>
                <td className="py-3">
                  {m.ciudad && m.provincia ? `${m.ciudad}, ${m.provincia}` : m.provincia || m.ciudad || "—"}
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                        onClick={() => cambiarEstado(m.id, "aprobado")}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    )}
                    {m.estado !== "suspendido" && (
                      <button
                        disabled={updating === m.id}
                        onClick={() => cambiarEstado(m.id, "suspendido")}
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
      )}
    </div>
  )
}

export default MayoristasPage
