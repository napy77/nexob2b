import { Migration } from "@mikro-orm/migrations"

export class Migration20260702000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "transporte"
        ADD COLUMN IF NOT EXISTS "tiene_seguimiento_propio" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "tracking_url_template"    TEXT NULL,
        ADD COLUMN IF NOT EXISTS "integracion_tipo"         TEXT NULL,
        ADD COLUMN IF NOT EXISTS "integracion_config"       JSONB NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "transporte"
        DROP COLUMN IF EXISTS "tiene_seguimiento_propio",
        DROP COLUMN IF EXISTS "tracking_url_template",
        DROP COLUMN IF EXISTS "integracion_tipo",
        DROP COLUMN IF EXISTS "integracion_config";
    `)
  }
}
