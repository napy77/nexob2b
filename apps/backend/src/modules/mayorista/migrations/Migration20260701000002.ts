import { Migration } from "@mikro-orm/migrations"

export class Migration20260701000002 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mayorista_mp_cuenta" (
        "id"                TEXT NOT NULL DEFAULT gen_random_uuid(),
        "mayorista_id"      TEXT NOT NULL,
        "mp_user_id"        TEXT,
        "mp_nickname"       TEXT,
        "access_token_enc"  TEXT NOT NULL,
        "refresh_token_enc" TEXT,
        "public_key"        TEXT,
        "live_mode"         BOOLEAN NOT NULL DEFAULT false,
        "scope"             TEXT,
        "created_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        PRIMARY KEY ("id"),
        UNIQUE ("mayorista_id")
      );
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "mayorista_mp_cuenta";`)
  }
}
