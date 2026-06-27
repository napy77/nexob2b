import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260627000002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "orden"
        ADD COLUMN IF NOT EXISTS "transporte_id"              TEXT          NULL,
        ADD COLUMN IF NOT EXISTS "transporte_nombre"          TEXT          NULL,
        ADD COLUMN IF NOT EXISTS "porcentaje_costo_transporte" NUMERIC(5,2)  NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "costo_transporte"           NUMERIC(15,2) NOT NULL DEFAULT 0;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "orden"
        DROP COLUMN IF EXISTS "transporte_id",
        DROP COLUMN IF EXISTS "transporte_nombre",
        DROP COLUMN IF EXISTS "porcentaje_costo_transporte",
        DROP COLUMN IF EXISTS "costo_transporte";
    `)
  }
}
