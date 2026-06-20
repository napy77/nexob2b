import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../../modules/comercio"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import { PRODUCTO_MODULE } from "../../../../modules/producto"
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

// GET /store/comercios/catalogo?rubro=&mayorista_id=&provincia=
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

  const { rubro, mayorista_id } = req.query as any

  // Obtener mayoristas aprobados cuyas zonas incluyan la provincia del comercio
  const todosMayoristas = await mayoristaService.listMayoristas({ estado: "aprobado" })

  // Filtrar por zona si el comercio tiene provincia
  const mayoristasFiltrados = comercio.provincia
    ? todosMayoristas.filter((m: any) => {
        const zonas: string[] = m.zonas || []
        return zonas.length === 0 || zonas.includes(comercio.provincia)
      })
    : todosMayoristas

  // Si piden un mayorista específico, filtrar sólo ese
  const mayoristaIds = mayorista_id
    ? mayoristasFiltrados.filter((m: any) => m.id === mayorista_id).map((m: any) => m.id)
    : mayoristasFiltrados.map((m: any) => m.id)

  if (mayoristaIds.length === 0) {
    return res.json({ productos: [], mayoristas: [] })
  }

  // Obtener productos activos de esos mayoristas
  const todosProductos = await productoService.listProductos(
    { activo: true },
    { order: { pasillo: "ASC", nombre: "ASC" } }
  )

  let productos = todosProductos.filter((p: any) => mayoristaIds.includes(p.mayorista_id))

  if (rubro) {
    productos = productos.filter((p: any) =>
      p.rubro?.toLowerCase().includes((rubro as string).toLowerCase())
    )
  }

  // Indexar mayoristas para lookup rápido
  const mayoristaMap = Object.fromEntries(
    mayoristasFiltrados.map((m: any) => [m.id, {
      id: m.id,
      nombre: m.nombre,
      telefono: m.telefono,
      email: m.email,
      ciudad: m.ciudad,
      provincia: m.provincia,
      rubros: m.rubros,
      zonas: m.zonas,
    }])
  )

  // Enriquecer productos con info del mayorista
  const productosConMayorista = productos.map((p: any) => ({
    ...p,
    mayorista: mayoristaMap[p.mayorista_id] || null,
  }))

  res.json({
    productos: productosConMayorista,
    mayoristas: Object.values(mayoristaMap),
  })
}
