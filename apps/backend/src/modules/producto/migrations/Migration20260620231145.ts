import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260620231145 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "producto" ("id" text not null, "mayorista_id" text not null, "nombre" text not null, "descripcion" text null, "precio" integer not null, "unidad" text not null, "compra_minima" integer not null default 1, "stock" integer null, "imagen_url" text null, "rubro" text null, "pasillo" text null, "activo" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "producto_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_producto_deleted_at" ON "producto" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "producto" cascade;`);
  }

}
