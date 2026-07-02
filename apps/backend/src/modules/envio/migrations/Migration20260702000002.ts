import { Migration } from "@mikro-orm/migrations"

export class Migration20260702000002 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "envio" (
        "id"                        VARCHAR(255)  NOT NULL PRIMARY KEY,
        "orden_id"                  VARCHAR(255)  NOT NULL,
        "mayorista_id"              VARCHAR(255)  NOT NULL,
        "transporte_id"             VARCHAR(255)  NULL,
        "transporte_nombre"         TEXT          NULL,
        "numero_guia"               TEXT          NULL,
        "token_publico"             VARCHAR(255)  NOT NULL UNIQUE,
        "tiene_seguimiento_propio"  BOOLEAN       NOT NULL DEFAULT FALSE,
        "tracking_url"              TEXT          NULL,
        "destinatario_nombre"       TEXT          NULL,
        "destinatario_email"        TEXT          NULL,
        "destinatario_telefono"     TEXT          NULL,
        "destinatario_direccion"    TEXT          NULL,
        "estado"                    VARCHAR(50)   NOT NULL DEFAULT 'pendiente',
        "eventos"                   JSONB         NOT NULL DEFAULT '[]',
        "cantidad_bultos"           INTEGER       NULL,
        "peso_kg"                   NUMERIC(8,2)  NULL,
        "dimensiones"               TEXT          NULL,
        "orden_numero"              TEXT          NULL,
        "created_at"                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "deleted_at"                TIMESTAMPTZ   NULL
      );

      CREATE INDEX IF NOT EXISTS "idx_envio_orden_id"      ON "envio" ("orden_id");
      CREATE INDEX IF NOT EXISTS "idx_envio_token_publico" ON "envio" ("token_publico");
      CREATE INDEX IF NOT EXISTS "idx_envio_mayorista_id"  ON "envio" ("mayorista_id");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "envio";`)
  }
}
