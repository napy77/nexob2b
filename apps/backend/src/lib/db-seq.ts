/**
 * Pool singleton + helper para secuencias atómicas via PostgreSQL.
 * `pg` está disponible como dependencia transitiva de @medusajs/medusa.
 */
import pg from "pg"

let _pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL no definida")
    _pool = new pg.Pool({ connectionString: url })
  }
  return _pool
}

/**
 * Devuelve el siguiente número de orden como "ORD-XXXXX".
 * Usa la secuencia `orden_numero_seq` — atómica bajo cualquier carga concurrente.
 */
export async function nextOrdenNumero(): Promise<string> {
  const { rows } = await getPool().query(
    "SELECT nextval('orden_numero_seq') AS num"
  )
  return `ORD-${String(rows[0].num).padStart(5, "0")}`
}
