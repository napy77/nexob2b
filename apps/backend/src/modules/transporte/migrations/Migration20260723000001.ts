import { Migration } from "@mikro-orm/migrations"

export class Migration20260723000001 extends Migration {
  async up(): Promise<void> {
    // 1. Extender CHECK constraint de tipo en transporte para incluir 'nexoflex'
    this.addSql(`ALTER TABLE "transporte" DROP CONSTRAINT IF EXISTS "transporte_tipo_check";`)
    this.addSql(`
      ALTER TABLE "transporte"
        ADD CONSTRAINT "transporte_tipo_check"
        CHECK (tipo IN ('retiro','envio_propio','correo','flete','moto','nexoflex'));
    `)

    // 2. Crear tabla de reglas NexoFlex
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "nexoflex_regla" (
        "id"               TEXT        NOT NULL PRIMARY KEY,
        "orden"            INTEGER     NOT NULL DEFAULT 0,
        "nombre"           TEXT        NOT NULL,
        "condicion"        TEXT        NOT NULL,
        "condicion_valor"  NUMERIC     NULL,
        "transporte_id"    TEXT        NOT NULL,
        "activo"           BOOLEAN     NOT NULL DEFAULT TRUE,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMPTZ NULL
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "nexoflex_regla_orden_idx" ON "nexoflex_regla" ("orden") WHERE deleted_at IS NULL;`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "nexoflex_regla";`)
    this.addSql(`ALTER TABLE "transporte" DROP CONSTRAINT IF EXISTS "transporte_tipo_check";`)
    this.addSql(`
      ALTER TABLE "transporte"
        ADD CONSTRAINT "transporte_tipo_check"
        CHECK (tipo IN ('retiro','envio_propio','correo','flete','moto'));
    `)
  }
}
