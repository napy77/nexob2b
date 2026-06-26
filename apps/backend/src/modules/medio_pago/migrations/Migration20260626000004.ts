import { Migration } from "@mikro-orm/migrations"

export class Migration20260626000004 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "medio_pago"
        ADD COLUMN IF NOT EXISTS "porcentaje_costo" NUMERIC(5,2) NOT NULL DEFAULT 0;
    `)
  }
  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "medio_pago" DROP COLUMN IF EXISTS "porcentaje_costo";`)
  }
}
