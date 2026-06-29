import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import { SOLICITUD_MODULE } from "../../../../modules/solicitud"
import jwt from "jsonwebtoken"

// Haversine: distancia en km entre dos puntos geográficos
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// GET /store/mayoristas/lista — comercio ve mayoristas disponibles con estado de relación y vendedor asignado
// Query params opcionales: lat, lng, radio_km (default 50), rubros (csv), busqueda
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const auth = req.headers.authorization?.replace("Bearer ", "")
    if (!auth) return res.status(401).json({ error: "No autorizado" })

    let payload: any
    try {
      payload = jwt.verify(auth, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
    } catch {
      return res.status(401).json({ error: "Token inválido" })
    }

    const comercioId = payload.comercio_id
    const q = req.query as any

    // Parámetros de búsqueda
    const latParam = q.lat ? parseFloat(q.lat) : null
    const lngParam = q.lng ? parseFloat(q.lng) : null
    const radioKm = q.radio_km ? parseFloat(q.radio_km) : 50
    const rubrosFiltro: string[] = q.rubros
      ? (Array.isArray(q.rubros) ? q.rubros : q.rubros.split(",").map((r: string) => r.trim()).filter(Boolean))
      : []
    const busqueda = q.busqueda ? String(q.busqueda).toLowerCase().trim() : ""

    const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)

    // Todos los mayoristas aprobados
    const mayoristas = await mayoristaService.listMayoristas(
      { estado: "aprobado" },
      { select: ["id", "nombre", "email", "telefono", "ciudad", "provincia", "rubros", "zonas", "descripcion", "visibilidad", "logo_url", "lat", "lng"] }
    )

    // Solicitudes del comercio
    const solicitudes = await solicitudService.listSolicituds({ comercio_id: comercioId })
    const solicitudMap: Record<string, any> = {}
    solicitudes.forEach((s: any) => { solicitudMap[s.mayorista_id] = s })

    // Vendedores asignados
    const vendedorIds = solicitudes
      .filter((s: any) => s.vendedor_id)
      .map((s: any) => s.vendedor_id)

    const vendedorMap: Record<string, any> = {}
    if (vendedorIds.length > 0) {
      const vendedores = await mayoristaService.listVendedors({ activo: true })
      vendedores
        .filter((v: any) => vendedorIds.includes(v.id))
        .forEach((v: any) => { vendedorMap[v.id] = v })
    }

    // Calcular distancia y armar resultado
    let resultado = mayoristas.map((m: any) => {
      const solicitud = solicitudMap[m.id] || null
      const vendedor = solicitud?.vendedor_id ? vendedorMap[solicitud.vendedor_id] || null : null

      let distancia_km: number | null = null
      if (latParam !== null && lngParam !== null && m.lat && m.lng) {
        distancia_km = Math.round(haversine(latParam, lngParam, m.lat, m.lng) * 10) / 10
      }

      return {
        ...m,
        distancia_km,
        solicitud,
        contacto: vendedor
          ? {
              nombre: `${vendedor.nombre} ${vendedor.apellido}`,
              celular: vendedor.celular || null,
              email: vendedor.email || null,
              es_vendedor: true,
            }
          : {
              nombre: m.nombre,
              celular: m.telefono || null,
              email: m.email || null,
              es_vendedor: false,
            },
      }
    })

    // Filtrar por radio si hay coordenadas
    // Los mayoristas sin lat/lng van al final (distancia_km = null)
    if (latParam !== null && lngParam !== null) {
      resultado = resultado.filter((m: any) => {
        if (m.distancia_km === null) return true // sin ubicación: incluir siempre
        return m.distancia_km <= radioKm
      })
    }

    // Filtrar por rubros (si se enviaron, el mayorista debe cubrir al menos uno)
    if (rubrosFiltro.length > 0) {
      resultado = resultado.filter((m: any) => {
        const rubrosM: string[] = m.rubros || []
        return rubrosFiltro.some((r: string) =>
          rubrosM.some((rm: string) => rm.toLowerCase() === r.toLowerCase())
        )
      })
    }

    // Filtrar por texto
    if (busqueda) {
      resultado = resultado.filter((m: any) =>
        m.nombre.toLowerCase().includes(busqueda) ||
        (m.ciudad || "").toLowerCase().includes(busqueda) ||
        (m.provincia || "").toLowerCase().includes(busqueda) ||
        (m.rubros || []).some((r: string) => r.toLowerCase().includes(busqueda))
      )
    }

    // Ordenar: primero con coordenadas (por distancia asc), luego sin coordenadas
    resultado.sort((a: any, b: any) => {
      if (a.distancia_km === null && b.distancia_km === null) return 0
      if (a.distancia_km === null) return 1
      if (b.distancia_km === null) return -1
      return a.distancia_km - b.distancia_km
    })

    return res.json({
      mayoristas: resultado,
      meta: {
        total: resultado.length,
        lat: latParam,
        lng: lngParam,
        radio_km: radioKm,
        rubros_filtro: rubrosFiltro,
        busqueda,
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
