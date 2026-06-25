import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { RUTA_MODULE } from "../../../../../modules/ruta"
import { MAYORISTA_MODULE } from "../../../../../modules/mayorista"
import { COMERCIO_MODULE } from "../../../../../modules/comercio"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
  } catch { return null }
}

// GET /store/mayoristas/me/rutas — listar rutas del mayorista
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const svc: any = req.scope.resolve(RUTA_MODULE)
  const rutas = await svc.listRutas(
    { mayorista_id: payload.mayorista_id },
    { order: { created_at: "DESC" } }
  )

  // Enriquecer con paradas
  const rutasConParadas = await Promise.all(rutas.map(async (r: any) => {
    const paradas = await svc.listRutaParadas({ ruta_id: r.id }, { order: { orden: "ASC" } })
    return { ...r, paradas }
  }))

  return res.json({ rutas: rutasConParadas })
}

// POST /store/mayoristas/me/rutas — crear ruta con paradas
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { vendedor_id, nombre, fecha, notas, comercios } = req.body as any
  // comercios: [{ comercio_id, orden }]

  if (!vendedor_id || !nombre || !fecha || !comercios?.length) {
    return res.status(400).json({ error: "Faltan campos requeridos: vendedor_id, nombre, fecha, comercios" })
  }

  // Verificar que el vendedor pertenece a este mayorista
  const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
  const vendedor = await mayoristaService.retrieveVendedor(vendedor_id).catch(() => null)
  if (!vendedor || vendedor.mayorista_id !== payload.mayorista_id) {
    return res.status(403).json({ error: "Vendedor no pertenece a este mayorista" })
  }

  // Obtener datos de cada comercio
  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  const svc: any = req.scope.resolve(RUTA_MODULE)

  const ruta = await svc.createRutas({
    mayorista_id: payload.mayorista_id,
    vendedor_id,
    nombre,
    fecha,
    notas: notas || null,
  })

  // Crear paradas
  const paradasData = await Promise.all(
    comercios.map(async (c: { comercio_id: string; orden: number }) => {
      const comercio = await comercioService.retrieveComercio(c.comercio_id).catch(() => null)
      return {
        ruta_id: ruta.id,
        comercio_id: c.comercio_id,
        comercio_nombre: comercio?.nombre || "Sin nombre",
        comercio_direccion: comercio?.direccion || null,
        comercio_lat: comercio?.lat ? parseFloat(comercio.lat) : null,
        comercio_lng: comercio?.lng ? parseFloat(comercio.lng) : null,
        orden: c.orden,
      }
    })
  )

  const paradas = await svc.createRutaParadas(paradasData)

  return res.status(201).json({ ruta: { ...ruta, paradas } })
}
