import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260626000006 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "mayorista_medio_pago"
        ADD COLUMN IF NOT EXISTS "porcentaje_costo" NUMERIC(5,2) NOT NULL DEFAULT 0;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "mayorista_medio_pago"
        DROP COLUMN IF EXISTS "porcentaje_costo";
    `)
  }
}
