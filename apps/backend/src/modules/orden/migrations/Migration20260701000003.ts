import { Migration } from "@mikro-orm/migrations"

export class Migration20260701000003 extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "mp_preference_id" TEXT;`)
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "mp_pago_id" TEXT;`)
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "mp_estado_pago" TEXT;`)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "mp_preference_id";`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "mp_pago_id";`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "mp_estado_pago";`)
  }
}
