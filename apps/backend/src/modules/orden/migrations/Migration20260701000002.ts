import { Migration } from "@mikro-orm/migrations"

export class Migration20260701000002 extends Migration {
  async up(): Promise<void> {
    // Tabla de códigos de descuento
    this.addSql(`
      CREATE TABLE IF NOT EXISTS codigo_descuento (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        mayorista_id TEXT NOT NULL,
        codigo TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('porcentaje', 'fijo')),
        valor NUMERIC(12,2) NOT NULL,
        uso_maximo INTEGER,
        usos_actuales INTEGER NOT NULL DEFAULT 0,
        fecha_vencimiento DATE,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(mayorista_id, codigo)
      );
    `)

    // Agregar campos de descuento a la orden
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "codigo_descuento_id" TEXT REFERENCES codigo_descuento(id) ON DELETE SET NULL;`)
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "monto_descuento" NUMERIC(12,2) NOT NULL DEFAULT 0;`)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "codigo_descuento_id";`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "monto_descuento";`)
    this.addSql(`DROP TABLE IF EXISTS codigo_descuento;`)
  }
}
