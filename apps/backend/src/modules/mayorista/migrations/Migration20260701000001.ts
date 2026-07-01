import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260701000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "lista_precio" (
        "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "mayorista_id"         TEXT NOT NULL,
        "nombre"               TEXT NOT NULL,
        "descuento_porcentaje" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "lista_precio_item" (
        "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "lista_id"    TEXT NOT NULL REFERENCES "lista_precio"("id") ON DELETE CASCADE,
        "producto_id" TEXT NOT NULL,
        "precio_fijo" NUMERIC(12,2) NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE("lista_id", "producto_id")
      );
    `)

    this.addSql(`
      ALTER TABLE "solicitud"
        ADD COLUMN IF NOT EXISTS "lista_precio_id" TEXT
          REFERENCES "lista_precio"("id") ON DELETE SET NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "solicitud" DROP COLUMN IF EXISTS "lista_precio_id";`)
    this.addSql(`DROP TABLE IF EXISTS "lista_precio_item";`)
    this.addSql(`DROP TABLE IF EXISTS "lista_precio";`)
  }
}
