import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../../modules/comercio"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import { PRODUCTO_MODULE } from "../../../../modules/producto"
import { SOLICITUD_MODULE } from "../../../../modules/solicitud"
import jwt from "jsonwebtoken"

const verifyToken = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const token = auth.split(" ")[1]
    return jwt.verify(token, process.env.JWT_SECRET!) as { comercio_id: string }
  } catch {
    return null
  }
}

// GET /store/comercios/catalogo
// Muestra productos según visibilidad del mayorista y relación del comercio:
// - publico: todos ven precio + contacto
// - con_precio: todos ven precio, contacto solo si aceptado
// - sin_precio: solo ven productos si relación aceptada (con precio y contacto)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const comercioService: any = req.scope.resolve(COMERCIO_MODULE)
  const comercio = await comercioService.retrieveComercio(payload.comercio_id)

  if (comercio.estado !== "aprobado") {
    return res.status(403).json({ error: "Tu cuenta debe estar aprobada para explorar el catálogo" })
  }

  const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
  const productoService: any = req.scope.resolve(PRODUCTO_MODULE)
  const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)

  const { rubro, pasillo, busqueda } = req.query as any

  // Solicitudes del comercio (para saber relaciones)
  const solicitudes = await solicitudService.listSolicituds({ comercio_id: payload.comercio_id })
  const solicitudMap: Record<string, any> = {}
  solicitudes.forEach((s: any) => { solicitudMap[s.mayorista_id] = s })

  // Mayoristas aprobados
  const todosMayoristas = await mayoristaService.listMayoristas({ estado: "aprobado" })

  // Incluir todos los mayoristas aprobados — la visibilidad controla qué info se muestra, no si aparece
  const mayoristasFiltrados = todosMayoristas

  if (mayoristasFiltrados.length === 0) {
    return res.json({ productos: [] })
  }

  const mayoristaIds = mayoristasFiltrados.map((m: any) => m.id)

  // Productos activos de esos mayoristas
  let productos = await productoService.listProductos(
    { activo: true },
    { order: { pasillo: "ASC", nombre: "ASC" } }
  )
  productos = productos.filter((p: any) => mayoristaIds.includes(p.mayorista_id))

  if (rubro) {
    productos = productos.filter((p: any) =>
      p.rubro?.toLowerCase().includes((rubro as string).toLowerCase())
    )
  }
  if (pasillo) {
    productos = productos.filter((p: any) =>
      p.pasillo?.toLowerCase().includes((pasillo as string).toLowerCase())
    )
  }
  if (busqueda) {
    const b = (busqueda as string).toLowerCase()
    productos = productos.filter((p: any) =>
      p.nombre?.toLowerCase().includes(b) ||
      p.rubro?.toLowerCase().includes(b) ||
      p.pasillo?.toLowerCase().includes(b)
    )
  }

  // Enriquecer con info del mayorista + reglas de acceso
  const mayoristaMap = Object.fromEntries(
    mayoristasFiltrados.map((m: any) => [m.id, m])
  )

  const productosEnriquecidos = productos.map((p: any) => {
    const m = mayoristaMap[p.mayorista_id]
    const vis = m?.visibilidad || "sin_precio"
    const solicitud = solicitudMap[m?.id] || null
    const aceptado = solicitud?.estado === "aceptado"
    const mostrarPrecio = vis === "publico" || vis === "con_precio" || aceptado
    const puedeContactar = vis === "publico" || aceptado

    return {
      ...p,
      precio: mostrarPrecio ? p.precio : null,
      mayorista: {
        id: m.id,
        nombre: m.nombre,
        telefono: puedeContactar ? m.telefono : null,
        email: puedeContactar ? m.email : null,
        ciudad: m.ciudad,
        provincia: m.provincia,
        visibilidad: vis,
      },
      acceso: {
        mostrarPrecio,
        puedeContactar,
        solicitud,
        visibilidad: vis,
      },
    }
  })

  return res.json({ productos: productosEnriquecidos })
}
