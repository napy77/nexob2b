/**
 * Almacén de configuración persistente en PostgreSQL.
 * Usa la misma pool de db-seq para no abrir nuevas conexiones.
 */
import { getPool } from "./db-seq"

async function ensureTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export async function getConfig(clave: string): Promise<string | null> {
  await ensureTable()
  const { rows } = await getPool().query(
    "SELECT valor FROM configuracion WHERE clave = $1",
    [clave]
  )
  return rows[0]?.valor ?? null
}

export async function setConfig(clave: string, valor: string): Promise<void> {
  await ensureTable()
  await getPool().query(
    `INSERT INTO configuracion (clave, valor, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = NOW()`,
    [clave, valor]
  )
}

export async function getManyConfig(claves: string[]): Promise<Record<string, string>> {
  await ensureTable()
  const { rows } = await getPool().query(
    "SELECT clave, valor FROM configuracion WHERE clave = ANY($1)",
    [claves]
  )
  return Object.fromEntries(rows.map((r: any) => [r.clave, r.valor]))
}

export async function setManyConfig(entries: Record<string, string>): Promise<void> {
  await ensureTable()
  for (const [clave, valor] of Object.entries(entries)) {
    await setConfig(clave, valor)
  }
}
