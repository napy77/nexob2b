import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MAYORISTA_MODULE } from "../../../../modules/mayorista"
import MayoristaModuleService from "../../../../modules/mayorista/service"
import { PRODUCTO_MODULE } from "../../../../modules/producto"
import jwt from "jsonwebtoken"
import fs from "fs"
import path from "path"

const verifyToken = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const token = auth.split(" ")[1]
    return jwt.verify(token, process.env.JWT_SECRET!) as { mayorista_id: string }
  } catch {
    return null
  }
}

// GET /store/mayoristas/productos — listar productos del mayorista autenticado
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const productoService: any = req.scope.resolve(PRODUCTO_MODULE)
  const productos = await productoService.listProductos(
    { mayorista_id: payload.mayorista_id },
    { order: { pasillo: "ASC", nombre: "ASC" } }
  )

  res.json({ productos })
}

// POST /store/mayoristas/productos — crear producto
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  // Verificar que el mayorista esté aprobado
  const mayoristaService: MayoristaModuleService = req.scope.resolve(MAYORISTA_MODULE)
  const mayorista = await mayoristaService.retrieveMayorista(payload.mayorista_id)
  if ((mayorista as any).estado !== "aprobado") {
    return res.status(403).json({ error: "Tu cuenta debe estar aprobada para publicar productos" })
  }

  const { nombre, descripcion, precio, unidad, compra_minima, stock, sku, ean, imagen_base64, rubro, pasillo } = req.body as any

  if (!nombre || !precio || !unidad) {
    return res.status(400).json({ error: "Campos requeridos: nombre, precio, unidad" })
  }

  let imagen_url: string | null = null

  if (imagen_base64) {
    try {
      const matches = imagen_base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (!matches) throw new Error("Formato de imagen inválido")
      const ext = matches[1].split("/")[1].replace("jpeg", "jpg")
      const buffer = Buffer.from(matches[2], "base64")
      const uploadsDir = path.join(process.cwd(), "uploads", "productos")
      fs.mkdirSync(uploadsDir, { recursive: true })
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      fs.writeFileSync(path.join(uploadsDir, filename), buffer)
      imagen_url = `/uploads/productos/${filename}`
    } catch (err: any) {
      return res.status(400).json({ error: `Error al procesar imagen: ${err.message}` })
    }
  }

  const productoService: any = req.scope.resolve(PRODUCTO_MODULE)
  const producto = await productoService.createProductos({
    mayorista_id: payload.mayorista_id,
    nombre,
    descripcion: descripcion || null,
    precio: parseFloat(precio),
    unidad,
    compra_minima: compra_minima ? parseInt(compra_minima) : 1,
    stock: stock !== undefined && stock !== "" ? parseInt(stock) : null,
    sku: sku || null,
    ean: ean || null,
    imagen_url,
    rubro: rubro || null,
    pasillo: pasillo || null,
    activo: true,
  })

  res.status(201).json({ producto })
}
