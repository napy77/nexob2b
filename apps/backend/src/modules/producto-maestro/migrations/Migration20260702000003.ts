import { Migration } from "@mikro-orm/migrations"

export class Migration20260702000003 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "producto" (
        "id" text NOT NULL,
        "ean" text NULL,
        "nombre" text NOT NULL,
        "descripcion" text NULL,
        "marca" text NULL,
        "unidad_base" text NOT NULL DEFAULT 'unidad',
        "alicuota_iva" numeric NOT NULL DEFAULT 21,
        "pasillo_id" text NULL,
        "rubro_id" text NULL,
        "subrubro_id" text NULL,
        "estado" text NOT NULL DEFAULT 'aprobado',
        "creado_por_mayorista_id" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "producto_ean_unique" ON "producto" ("ean") WHERE ean IS NOT NULL AND deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "producto_estado_idx" ON "producto" ("estado");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "producto_pasillo_idx" ON "producto" ("pasillo_id");`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "producto_presentacion" (
        "id" text NOT NULL,
        "producto_id" text NOT NULL,
        "nombre" text NOT NULL,
        "factor" numeric NOT NULL DEFAULT 1,
        "unidades_nivel_anterior" numeric NULL,
        "ean_propio" text NULL,
        "peso_g" numeric NULL,
        "largo_mm" numeric NULL,
        "ancho_mm" numeric NULL,
        "alto_mm" numeric NULL,
        "orden" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "producto_presentacion_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "fk_presentacion_producto" FOREIGN KEY ("producto_id") REFERENCES "producto" ("id") ON DELETE CASCADE
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "presentacion_producto_idx" ON "producto_presentacion" ("producto_id");`)

    // Secuencia para EAN internos NXB-xxxxxxx
    this.addSql(`CREATE SEQUENCE IF NOT EXISTS nexob2b_ean_seq START WITH 1000001;`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "producto_presentacion";`)
    this.addSql(`DROP TABLE IF EXISTS "producto";`)
    this.addSql(`DROP SEQUENCE IF EXISTS nexob2b_ean_seq;`)
  }
}
