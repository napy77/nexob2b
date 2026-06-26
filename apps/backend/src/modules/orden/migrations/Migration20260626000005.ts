import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260626000005 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "orden"
        ADD COLUMN IF NOT EXISTS "medio_pago_id"      TEXT         NULL,
        ADD COLUMN IF NOT EXISTS "medio_pago_nombre"  TEXT         NULL,
        ADD COLUMN IF NOT EXISTS "porcentaje_costo_mp" NUMERIC(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "costo_medio_pago"   NUMERIC(15,2) NOT NULL DEFAULT 0;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "orden"
        DROP COLUMN IF EXISTS "medio_pago_id",
        DROP COLUMN IF EXISTS "medio_pago_nombre",
        DROP COLUMN IF EXISTS "porcentaje_costo_mp",
        DROP COLUMN IF EXISTS "costo_medio_pago";
    `)
  }
}
