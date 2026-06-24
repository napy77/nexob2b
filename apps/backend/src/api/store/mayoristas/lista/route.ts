import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import { SOLICITUD_MODULE } from "../../../../modules/solicitud"
import jwt from "jsonwebtoken"

// GET /store/mayoristas/lista — comercio ve mayoristas disponibles con estado de relación y vendedor asignado
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
    const mayoristaService: any = req.scope.resolve(MAYORISTA_MODULE)
    const solicitudService: any = req.scope.resolve(SOLICITUD_MODULE)

    // Todos los mayoristas aprobados
    const mayoristas = await mayoristaService.listMayoristas(
      { estado: "aprobado" },
      { select: ["id", "nombre", "email", "telefono", "ciudad", "provincia", "rubros", "zonas", "descripcion", "visibilidad", "logo_url"] }
    )

    // Solicitudes del comercio
    const solicitudes = await solicitudService.listSolicituds({ comercio_id: comercioId })
    const solicitudMap: Record<string, any> = {}
    solicitudes.forEach((s: any) => { solicitudMap[s.mayorista_id] = s })

    // Cargar vendedores necesarios (los que están asignados en alguna solicitud)
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

    const resultado = mayoristas.map((m: any) => {
      const solicitud = solicitudMap[m.id] || null
      const vendedor = solicitud?.vendedor_id ? vendedorMap[solicitud.vendedor_id] || null : null

      return {
        ...m,
        solicitud,
        // Datos de contacto resueltos: vendedor si hay, sino el mayorista
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

    return res.json({ mayoristas: resultado })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
