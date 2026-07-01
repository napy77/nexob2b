import { Migration } from "@mikro-orm/migrations"

export class Migration20260701000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "orden"
        ADD COLUMN IF NOT EXISTS "mensaje_mayorista" TEXT NULL;
    `)
    // stock ya existe en producto, pero aseguramos que esté
    this.addSql(`
      ALTER TABLE "producto"
        ADD COLUMN IF NOT EXISTS "stock" INTEGER NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "mensaje_mayorista";`)
  }
}
