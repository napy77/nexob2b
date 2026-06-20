import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260620174900 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mayorista" ("id" text not null, "nombre" text not null, "cuit" text not null, "email" text not null, "telefono" text null, "direccion" text null, "ciudad" text null, "provincia" text null, "rubros" jsonb not null, "estado" text check ("estado" in ('pendiente', 'aprobado', 'suspendido')) not null default 'pendiente', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mayorista_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mayorista_deleted_at" ON "mayorista" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mayorista" cascade;`);
  }

}
