import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTO_MODULE } from "../../../../../modules/producto"
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

// GET /store/mayoristas/productos/:id
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const productoService: any = req.scope.resolve(PRODUCTO_MODULE)
  const producto = await productoService.retrieveProducto(req.params.id)

  if (producto.mayorista_id !== payload.mayorista_id) {
    return res.status(403).json({ error: "No tenés acceso a este producto" })
  }

  res.json({ producto })
}

// PUT /store/mayoristas/productos/:id
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const productoService: any = req.scope.resolve(PRODUCTO_MODULE)
  const existing = await productoService.retrieveProducto(req.params.id)

  if (existing.mayorista_id !== payload.mayorista_id) {
    return res.status(403).json({ error: "No tenés acceso a este producto" })
  }

  const { nombre, descripcion, precio, unidad, compra_minima, stock, imagen_base64, rubro, pasillo, activo } = req.body as any

  const updateData: Record<string, any> = { id: req.params.id }
  if (nombre !== undefined) updateData.nombre = nombre
  if (descripcion !== undefined) updateData.descripcion = descripcion
  if (precio !== undefined) updateData.precio = parseFloat(precio)
  if (unidad !== undefined) updateData.unidad = unidad
  if (compra_minima !== undefined) updateData.compra_minima = parseInt(compra_minima)
  if (stock !== undefined) updateData.stock = stock !== "" ? parseInt(stock) : null
  if (rubro !== undefined) updateData.rubro = rubro
  if (pasillo !== undefined) updateData.pasillo = pasillo
  if (activo !== undefined) updateData.activo = activo

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
      updateData.imagen_url = `/uploads/productos/${filename}`

      const old = existing.imagen_url
      if (old) {
        const oldPath = path.join(process.cwd(), old)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
    } catch (err: any) {
      return res.status(400).json({ error: `Error al procesar imagen: ${err.message}` })
    }
  }

  const producto = await productoService.updateProductos(updateData)
  res.json({ producto })
}

// DELETE /store/mayoristas/productos/:id
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const productoService: any = req.scope.resolve(PRODUCTO_MODULE)
  const existing = await productoService.retrieveProducto(req.params.id)

  if (existing.mayorista_id !== payload.mayorista_id) {
    return res.status(403).json({ error: "No tenés acceso a este producto" })
  }

  const imagenUrl = existing.imagen_url
  if (imagenUrl) {
    const imgPath = path.join(process.cwd(), imagenUrl)
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath)
  }

  await productoService.deleteProductos(req.params.id)
  res.json({ success: true })
}
