import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260629000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "mayorista"
        ADD COLUMN IF NOT EXISTS "lat" NUMERIC(10,7) NULL,
        ADD COLUMN IF NOT EXISTS "lng" NUMERIC(10,7) NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "mayorista"
        DROP COLUMN IF EXISTS "lat",
        DROP COLUMN IF EXISTS "lng";
    `)
  }
}
