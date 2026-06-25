import { Migration } from "@mikro-orm/migrations"

export class Migration20260625000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "ruta" (
        "id"           VARCHAR(255) NOT NULL PRIMARY KEY,
        "mayorista_id" VARCHAR(255) NOT NULL,
        "vendedor_id"  VARCHAR(255) NOT NULL,
        "nombre"       VARCHAR(255) NOT NULL,
        "fecha"        VARCHAR(20)  NOT NULL,
        "estado"       VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
        "hora_inicio"  VARCHAR(50)  NULL,
        "hora_fin"     VARCHAR(50)  NULL,
        "notas"        TEXT         NULL,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"   TIMESTAMPTZ  NULL
      );

      CREATE TABLE IF NOT EXISTS "ruta_parada" (
        "id"                  VARCHAR(255) NOT NULL PRIMARY KEY,
        "ruta_id"             VARCHAR(255) NOT NULL,
        "comercio_id"         VARCHAR(255) NOT NULL,
        "comercio_nombre"     VARCHAR(255) NOT NULL,
        "comercio_direccion"  TEXT         NULL,
        "comercio_lat"        NUMERIC(10,7) NULL,
        "comercio_lng"        NUMERIC(10,7) NULL,
        "orden"               INTEGER      NOT NULL,
        "estado"              VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
        "hora_llegada"        VARCHAR(50)  NULL,
        "hora_salida"         VARCHAR(50)  NULL,
        "notas"               TEXT         NULL,
        "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"          TIMESTAMPTZ  NULL
      );

      CREATE TABLE IF NOT EXISTS "ruta_track" (
        "id"         VARCHAR(255)  NOT NULL PRIMARY KEY,
        "ruta_id"    VARCHAR(255)  NOT NULL,
        "lat"        NUMERIC(10,7) NOT NULL,
        "lng"        NUMERIC(10,7) NOT NULL,
        "timestamp"  VARCHAR(50)   NOT NULL,
        "created_at" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ   NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ruta_mayorista  ON ruta(mayorista_id);
      CREATE INDEX IF NOT EXISTS idx_ruta_vendedor   ON ruta(vendedor_id);
      CREATE INDEX IF NOT EXISTS idx_ruta_fecha      ON ruta(fecha);
      CREATE INDEX IF NOT EXISTS idx_parada_ruta     ON ruta_parada(ruta_id);
      CREATE INDEX IF NOT EXISTS idx_track_ruta      ON ruta_track(ruta_id);
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "ruta_track";
      DROP TABLE IF EXISTS "ruta_parada";
      DROP TABLE IF EXISTS "ruta";
    `)
  }
}
