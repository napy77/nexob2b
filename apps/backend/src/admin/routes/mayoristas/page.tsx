import { defineRouteConfig } from "@medusajs/admin-sdk"
import React, { useState, useEffect } from "react"
import { Container, Heading, Badge, Button, Table, Text } from "@medusajs/ui"

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
  zonas: string[]
  estado: "pendiente" | "aprobado" | "suspendido"
  created_at: string
}

const ESTADO_COLORS: Record<string, "orange" | "green" | "red"> = {
  pendiente: "orange",
  aprobado: "green",
  suspendido: "red",
}

export default function MayoristasPage() {
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchMayoristas = async () => {
    const res = await fetch("/admin/mayoristas", { credentials: "include" })
    const data = await res.json()
    setMayoristas(data.mayoristas || [])
    setLoading(false)
  }

  useEffect(() => { fetchMayoristas() }, [])

  const cambiarEstado = async (id: string, estado: string) => {
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

  if (loading) {
    return <Container><Text>Cargando...</Text></Container>
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading level="h1">Mayoristas</Heading>
        <Badge color="grey">{mayoristas.length} registrados</Badge>
      </div>

      {mayoristas.length === 0 ? (
        <div className="text-center py-12">
          <Text className="text-ui-fg-muted">No hay mayoristas registrados todavía.</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Empresa</Table.HeaderCell>
              <Table.HeaderCell>CUIT</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Ubicación</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Acciones</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {mayoristas.map((m) => (
              <Table.Row key={m.id}>
                <Table.Cell>
                  <Text weight="plus">{m.nombre}</Text>
                  <Text size="small">{m.rubros.join(", ")}</Text>
                </Table.Cell>
                <Table.Cell>{m.cuit}</Table.Cell>
                <Table.Cell>{m.email}</Table.Cell>
                <Table.Cell>
                  {m.ciudad && m.provincia ? `${m.ciudad}, ${m.provincia}` : m.provincia || m.ciudad || "—"}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={ESTADO_COLORS[m.estado] || "grey"}>{m.estado}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    {m.estado !== "aprobado" && (
                      <Button size="small" variant="secondary" disabled={updating === m.id}
                        onClick={() => cambiarEstado(m.id, "aprobado")}>
                        Aprobar
                      </Button>
                    )}
                    {m.estado !== "suspendido" && (
                      <Button size="small" variant="danger" disabled={updating === m.id}
                        onClick={() => cambiarEstado(m.id, "suspendido")}>
                        Suspender
                      </Button>
                    )}
                    {m.estado === "suspendido" && (
                      <Button size="small" variant="secondary" disabled={updating === m.id}
                        onClick={() => cambiarEstado(m.id, "pendiente")}>
                        Reactivar
                      </Button>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}
