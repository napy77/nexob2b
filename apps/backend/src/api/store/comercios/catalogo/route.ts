import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMERCIO_MODULE } from "../../../../modules/comercio"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import { PRODUCTO_MODULE } from "../../../../modules/producto"
import { SOLICITUD_MODULE } from "../../../../modules/solicitud"
import { TAXONOMIA_MODULE } from "../../../../modules/taxonomia"
import jwt from "jsonwebtoken"

// Extrae el contacto efectivo: vendedor si tiene, sino mayorista
function resolverContacto(solicitud: any, vendedorMap: Record<string, any>, mayorista: any) {
  const v = solicitud?.vendedor_id ? vendedorMap[solicitud.vendedor_id] : null
  if (v) {
    return {
      contacto_nombre: `${v.nombre} ${v.apellido}`,
      contacto_celular: v.celular || null,
      contacto_email: v.email || null,
      es_vendedor: true,
    }
  }
  return {
    contacto_nombre: mayorista.nombre,
    contacto_celular: mayorista.telefono || null,
    contacto_email: mayorista.email || null,
    es_vendedor: false,
  }
}

const verifyToken = (req: MedusaRequest): { comercio_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const token = auth.split(" ")[1]
    return jwt.verify(token, process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { comercio_id: string }
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
  const taxonomiaService: any = req.scope.resolve(TAXONOMIA_MODULE)

  // Tipos impositivos para resolver precio_con_impuestos según condicion_fiscal
  const [tiposImpositivos, rubrosDB, pasillosDB] = await Promise.all([
    taxonomiaService.listTipoImpositivos({}),
    taxonomiaService.listRubros({}),
    taxonomiaService.listPasillos({}),
  ])
  const tipoMap: Record<string, { precio_con_impuestos: boolean }> = {}
  tiposImpositivos.forEach((t: any) => { tipoMap[t.nombre] = t })

  // Mapa: nombre_rubro (lowercase) → nombre_pasillo (derivado de taxonomy)
  const pasilloNombreMap: Record<string, string> = {}
  pasillosDB.forEach((p: any) => { pasilloNombreMap[p.id] = p.nombre })
  const rubToPasillo: Record<string, string> = {}
  rubrosDB.forEach((r: any) => {
    if (r.pasillo_id && pasilloNombreMap[r.pasillo_id]) {
      rubToPasillo[r.nombre.toLowerCase()] = pasilloNombreMap[r.pasillo_id]
    }
  })

  // precio_con_impuestos del comercio logueado
  const comercio_precio_con_impuestos: boolean =
    comercio.condicion_fiscal
      ? (tipoMap[comercio.condicion_fiscal]?.precio_con_impuestos ?? true)
      : true

  const { rubro, pasillo, busqueda } = req.query as any

  // Solicitudes del comercio (para saber relaciones)
  const solicitudes = await solicitudService.listSolicituds({ comercio_id: payload.comercio_id })
  const solicitudMap: Record<string, any> = {}
  solicitudes.forEach((s: any) => { solicitudMap[s.mayorista_id] = s })

  // Cargar vendedores de los mayoristas con relación aceptada
  const vendedorMap: Record<string, any> = {}
  const vendedorIds = solicitudes
    .filter((s: any) => s.vendedor_id)
    .map((s: any) => s.vendedor_id)
  if (vendedorIds.length > 0) {
    const vendedores = await mayoristaService.listVendedors({ activo: true })
    vendedores.forEach((v: any) => { vendedorMap[v.id] = v })
  }

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

    // precio_con_impuestos del mayorista (según su condicion_fiscal)
    const mayorista_precio_con_impuestos: boolean =
      m?.condicion_fiscal
        ? (tipoMap[m.condicion_fiscal]?.precio_con_impuestos ?? true)
        : true

    // Se muestra precio desglosado (neto + IVA) solo cuando ambos son RI (precio_con_impuestos = false)
    const mostrarDesglosado = !mayorista_precio_con_impuestos && !comercio_precio_con_impuestos

    const contacto = puedeContactar
      ? resolverContacto(solicitudMap[m?.id], vendedorMap, m)
      : { contacto_nombre: null, contacto_celular: null, contacto_email: null, es_vendedor: false }

    // Pasillo: usar el del producto, o derivarlo del rubro vía taxonomía
    const pasilloFinal = p.pasillo || (p.rubro ? rubToPasillo[p.rubro.toLowerCase()] : null) || null

    return {
      ...p,
      pasillo: pasilloFinal,
      precio: mostrarPrecio ? p.precio : null,
      alicuota_iva: p.alicuota_iva ?? 21,
      mayorista: {
        id: m.id,
        nombre: m.nombre,
        telefono: contacto.contacto_celular,
        email: contacto.contacto_email,
        contacto_nombre: contacto.contacto_nombre,
        es_vendedor: contacto.es_vendedor,
        ciudad: m.ciudad,
        provincia: m.provincia,
        visibilidad: vis,
        precio_con_impuestos: mayorista_precio_con_impuestos,
        logo_url: m.logo_url || null,
      },
      acceso: {
        mostrarPrecio,
        puedeContactar,
        solicitud,
        visibilidad: vis,
        mostrarDesglosado,
      },
    }
  })

  return res.json({ productos: productosEnriquecidos, comercio_precio_con_impuestos })
}
