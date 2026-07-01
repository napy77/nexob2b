/**
 * POST /store/mayoristas/:id/codigos-descuento/validar
 * Valida un código de descuento sin quemarlo.
 * Body: { codigo: string, total: number }
 * Returns: { valido: true, tipo, valor, monto_descuento, codigo_descuento_id }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"
import { getPool } from "../../../../../../lib/db-seq"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "No autorizado" })
  try {
    jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "nexob2b_jwt_secret_2026")
  } catch { return res.status(401).json({ error: "Token inválido" }) }

  const { id: mayoristaId } = req.params
  const { codigo, total } = req.body as any

  if (!codigo) return res.status(400).json({ error: "codigo requerido" })

  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT * FROM codigo_descuento
     WHERE mayorista_id = $1 AND UPPER(codigo) = UPPER($2) AND activo = true`,
    [mayoristaId, codigo]
  )
  const cd = rows[0]

  if (!cd) return res.status(404).json({ error: "Código no encontrado o inactivo" })

  // Verificar vencimiento
  if (cd.fecha_vencimiento && new Date(cd.fecha_vencimiento) < new Date()) {
    return res.status(400).json({ error: "El código está vencido" })
  }

  // Verificar usos
  if (cd.uso_maximo !== null && cd.usos_actuales >= cd.uso_maximo) {
    return res.status(400).json({ error: "El código ya alcanzó el límite de usos" })
  }

  const valor = parseFloat(cd.valor)
  const totalNum = parseFloat(total) || 0
  const monto_descuento = cd.tipo === "porcentaje"
    ? Math.round(totalNum * valor / 100 * 100) / 100
    : Math.min(valor, totalNum)

  return res.json({
    valido: true,
    codigo_descuento_id: cd.id,
    tipo: cd.tipo,
    valor,
    monto_descuento,
  })
}
