import { Migration } from "@mikro-orm/migrations"

export class Migration20260702000004 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "producto_mayorista_listing" (
        "id" text NOT NULL,
        "producto_id" text NOT NULL,
        "mayorista_id" text NOT NULL,
        "descripcion_propia" text NULL,
        "notas" text NULL,
        "tiempo_entrega_dias" integer NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "aprobado" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "producto_mayorista_listing_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "listing_unique" UNIQUE ("producto_id", "mayorista_id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "listing_mayorista_idx" ON "producto_mayorista_listing" ("mayorista_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "listing_producto_idx" ON "producto_mayorista_listing" ("producto_id");`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "producto_mayorista_presentacion" (
        "id" text NOT NULL,
        "listing_id" text NOT NULL,
        "presentacion_id" text NOT NULL,
        "precio" numeric NOT NULL,
        "precio_lista" numeric NULL,
        "stock" numeric NOT NULL DEFAULT 0,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "producto_mayorista_presentacion_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "mp_unique" UNIQUE ("listing_id", "presentacion_id"),
        CONSTRAINT "fk_mp_listing" FOREIGN KEY ("listing_id") REFERENCES "producto_mayorista_listing" ("id") ON DELETE CASCADE
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "mp_listing_idx" ON "producto_mayorista_presentacion" ("listing_id");`)

    // Agregar presentacion_id a orden_item para nuevos pedidos
    this.addSql(`ALTER TABLE "orden_item" ADD COLUMN IF NOT EXISTS "presentacion_id" text NULL;`)
    this.addSql(`ALTER TABLE "orden_item" ADD COLUMN IF NOT EXISTS "listing_id" text NULL;`)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "orden_item" DROP COLUMN IF EXISTS "presentacion_id";`)
    this.addSql(`ALTER TABLE "orden_item" DROP COLUMN IF EXISTS "listing_id";`)
    this.addSql(`DROP TABLE IF EXISTS "producto_mayorista_presentacion";`)
    this.addSql(`DROP TABLE IF EXISTS "producto_mayorista_listing";`)
  }
}
