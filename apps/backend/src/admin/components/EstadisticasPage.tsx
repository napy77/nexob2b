import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
function mesLabel(m: string) {
  const [y, mo] = m.split("-"); return `${MESES[Number(mo) - 1]} ${y}`
}
function mesPrev(m: string) {
  const [y, mo] = m.split("-").map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
function mesNext(m: string) {
  const [y, mo] = m.split("-").map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function Var({ pct }: { pct: number }) {
  if (pct === 0) return <span style={{ color: "#9ca3af", fontSize: 11 }}>sin cambio</span>
  return <span style={{ color: pct > 0 ? "#059669" : "#dc2626", fontSize: 11, fontWeight: 700 }}>
    {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% vs mes ant.
  </span>
}

function Card({ label, value, variacion, prefix = "$" }: { label: string; value: number; variacion: number; prefix?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "16px 20px" }}>
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
        {prefix}{value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
      </div>
      <Var pct={variacion} />
    </div>
  )
}

export default function EstadisticasPage() {
  const [mes, setMes] = useState(mesActual())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const cargar = async (m: string) => {
    setLoading(true); setError("")
    try {
      const res = await fetch(`/admin/estadisticas?mes=${m}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Error")
      setData(json)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar(mes) }, [mes])

  const cambiarMes = (dir: "prev" | "next") => {
    const nuevo = dir === "prev" ? mesPrev(mes) : mesNext(mes)
    if (nuevo > mesActual()) return
    setMes(nuevo)
  }

  const COLORS: Record<string, { bg: string; color: string }> = {
    pendiente:  { bg: "#fef3c7", color: "#92400e" },
    confirmado: { bg: "#dbeafe", color: "#1e40af" },
    enviado:    { bg: "#ede9fe", color: "#5b21b6" },
    entregado:  { bg: "#d1fae5", color: "#065f46" },
    cancelado:  { bg: "#fee2e2", color: "#991b1b" },
    devuelto:   { bg: "#ffedd5", color: "#9a3412" },
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 24 }}>📊 Estadísticas</h1>

      {/* Selector de mes */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button onClick={() => cambiarMes("prev")} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 18 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 700, minWidth: 160, textAlign: "center" }}>{mesLabel(mes)}</span>
        <button onClick={() => cambiarMes("next")} disabled={mes >= mesActual()} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 18, opacity: mes >= mesActual() ? 0.3 : 1 }}>›</button>
      </div>

      {error && <div style={{ color: "#dc2626", marginBottom: 16, fontSize: 14 }}>{error}</div>}

      {loading && <div style={{ color: "#9ca3af", fontSize: 14 }}>Cargando...</div>}

      {!loading && data && (
        <>
          {/* Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            <Card label="Ventas totales" value={data.actual.total_ventas} variacion={data.variacion.total_ventas} />
            <Card label="Órdenes" value={data.actual.cantidad_ordenes} variacion={data.variacion.cantidad_ordenes} prefix="" />
            <Card label="Ticket promedio" value={data.actual.ticket_promedio} variacion={data.variacion.ticket_promedio} />
          </div>

          {/* Por estado */}
          {Object.keys(data.actual.por_estado).length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Órdenes por estado</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(data.actual.por_estado).map(([estado, cant]: any) => {
                  const c = COLORS[estado] || { bg: "#f3f4f6", color: "#374151" }
                  return (
                    <div key={estado} style={{ background: c.bg, color: c.color, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                      {estado.charAt(0).toUpperCase() + estado.slice(1)}: {cant}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mayoristas top (solo en vista global) */}
          {data.actual.mayoristas_top?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>🏭 Mayoristas top</div>
              {data.actual.mayoristas_top.map((m: any, i: number) => (
                <div key={m.mayorista_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < data.actual.mayoristas_top.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ fontSize: 13, color: "#374151" }}>#{i + 1} {m.nombre || "Sin nombre"}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>${m.total_monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.cantidad_ordenes} órdenes</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Productos top */}
          {data.actual.productos_top?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>🏆 Productos más vendidos</div>
              {data.actual.productos_top.map((p: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < data.actual.productos_top.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>#{i + 1} {p.nombre}</div>
                    {p.sku && <div style={{ fontSize: 11, color: "#9ca3af" }}>SKU: {p.sku}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>${p.total_monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{p.total_cantidad} unid.</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comercios top */}
          {data.actual.comercios_top?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>🏪 Comercios top</div>
              {data.actual.comercios_top.map((c: any, i: number) => (
                <div key={c.comercio_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < data.actual.comercios_top.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ fontSize: 13, color: "#374151" }}>#{i + 1} {c.nombre}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>${c.total_monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{c.cantidad_ordenes} órdenes</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vendedores */}
          {data.actual.vendedores?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>👤 Rendimiento vendedores</div>
              {data.actual.vendedores.map((v: any, i: number) => (
                <div key={v.vendedor_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < data.actual.vendedores.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ fontSize: 13, color: "#374151" }}>#{i + 1} {v.nombre}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>${v.total_monto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{v.cantidad_ordenes} órdenes</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.actual.cantidad_ordenes === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div>Sin órdenes en {mesLabel(mes)}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
