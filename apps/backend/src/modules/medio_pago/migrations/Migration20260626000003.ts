import { Migration } from "@mikro-orm/migrations"

export class Migration20260626000003 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "contacto_medio_pago" (
        "id"            VARCHAR(255) NOT NULL PRIMARY KEY,
        "mayorista_id"  VARCHAR(255) NOT NULL,
        "comercio_id"   VARCHAR(255) NOT NULL,
        "medio_pago_id" VARCHAR(255) NOT NULL,
        "habilitado"    BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"    TIMESTAMPTZ  NULL,
        UNIQUE ("mayorista_id", "comercio_id", "medio_pago_id")
      );
      CREATE INDEX IF NOT EXISTS idx_cmp_mayorista_comercio ON contacto_medio_pago(mayorista_id, comercio_id);
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "contacto_medio_pago";`)
  }
}
