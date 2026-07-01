import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ORDEN_MODULE } from "../../../../../../../modules/orden"
import { getPool } from "../../../../../../../lib/db-seq"
import jwt from "jsonwebtoken"
import fs from "fs"
import path from "path"

const verifyMayorista = (req: MedusaRequest): { mayorista_id: string } | null => {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    return jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026") as { mayorista_id: string }
  } catch { return null }
}

// GET /store/mayoristas/me/ordenes/:id/documentos
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { id } = req.params
  const svc: any = req.scope.resolve(ORDEN_MODULE)

  const orden = await svc.retrieveOrden(id).catch(() => null)
  if (!orden || orden.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Pedido no encontrado" })
  }

  const documentos = await svc.listOrdenDocumentos(
    { orden_id: id },
    { order: { created_at: "ASC" } }
  )
  return res.json({ documentos })
}

// POST /store/mayoristas/me/ordenes/:id/documentos
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = verifyMayorista(req)
  if (!payload) return res.status(401).json({ error: "No autorizado" })

  const { id } = req.params
  const svc: any = req.scope.resolve(ORDEN_MODULE)

  const orden = await svc.retrieveOrden(id).catch(() => null)
  if (!orden || orden.mayorista_id !== payload.mayorista_id) {
    return res.status(404).json({ error: "Pedido no encontrado" })
  }

  const { nombre, tipo, archivo_base64 } = req.body as any
  if (!nombre || !archivo_base64) {
    return res.status(400).json({ error: "Faltan nombre o archivo" })
  }

  const match = archivo_base64.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/.]+);base64,(.+)$/)
  if (!match) return res.status(400).json({ error: "Formato de archivo inválido" })

  const mime = match[1]
  const buffer = Buffer.from(match[2], "base64")

  // Determinar extensión
  const extMap: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }
  const ext = extMap[mime] || "bin"

  const uploadDir = path.join(process.cwd(), ".medusa", "server", "public", "documentos")
  fs.mkdirSync(uploadDir, { recursive: true })
  const filename = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  fs.writeFileSync(path.join(uploadDir, filename), buffer)

  const documento = await svc.createOrdenDocumentos({
    orden_id: id,
    mayorista_id: payload.mayorista_id,
    nombre,
    tipo: tipo || "otro",
    url: `/documentos/${filename}`,
  })

  // Auto-set is_facturada cuando el mayorista sube una factura
  if ((tipo === "factura") && !orden.is_facturada) {
    await getPool().query(
      `UPDATE orden SET is_facturada = true, updated_at = now() WHERE id = $1`,
      [id]
    )
  }

  // Auto-set is_pagada cuando el mayorista sube un recibo y ya existe comprobante del comercio
  if (tipo === "recibo" && !orden.is_pagada) {
    const { rows } = await getPool().query(
      `SELECT id FROM orden_documento WHERE orden_id = $1 AND tipo = 'comprobante_pago' LIMIT 1`,
      [id]
    )
    if (rows.length > 0) {
      await getPool().query(
        `UPDATE orden SET is_pagada = true, updated_at = now() WHERE id = $1`,
        [id]
      )
    }
  }

  return res.status(201).json({ documento })
}
