-- Import de taxonomia (Pasillo > Rubro > Subrubro) desde DIA Online
-- Origen: https://diaonline.supermercadosdia.com.ar/api/catalog_system/pub/category/tree/3
-- Generado: 2026-07-06 — 16 pasillos, 105 rubros, 457 subrubros (463 filas hoja en data.csv,
-- de las cuales algunos rubros no tienen subrubro propio: "Hombre", "Envases", "Electros de
-- cocina", "Combos Frescos", "Combos Almacén", etc. -- esas quedan con subrubro vacio)
--
-- REQUISITO PREVIO: correr la migracion Migration20260706000001 (agrega pasillo_id a rubro,
-- y crea pasillo/rubro/subrubro si no existian). Sin eso este script va a fallar.
--
-- Es idempotente: se puede correr de nuevo sin duplicar nada (usa NOT EXISTS por nombre
-- dentro de cada padre). No pisa nombres cargados a mano desde el admin.
--
-- Uso (en el servidor, desde este directorio):
--   psql "postgres://nexob2b:nexob2b_secure_2026@localhost/nexob2b_db" -f import.sql

BEGIN;

CREATE TEMP TABLE staging_dia_taxonomia (
  pasillo text,
  rubro text,
  subrubro text
);

\copy staging_dia_taxonomia (pasillo, rubro, subrubro) FROM 'data.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 1) Pasillos
INSERT INTO pasillo (id, nombre, activo, created_at, updated_at)
SELECT gen_random_uuid()::text, s.pasillo, true, now(), now()
FROM (SELECT DISTINCT pasillo FROM staging_dia_taxonomia) s
WHERE NOT EXISTS (
  SELECT 1 FROM pasillo p WHERE p.nombre = s.pasillo AND p.deleted_at IS NULL
);

-- 2) Rubros (ligados a su pasillo)
INSERT INTO rubro (id, nombre, pasillo_id, activo, created_at, updated_at)
SELECT gen_random_uuid()::text, s.rubro, p.id, true, now(), now()
FROM (SELECT DISTINCT pasillo, rubro FROM staging_dia_taxonomia) s
JOIN pasillo p ON p.nombre = s.pasillo AND p.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM rubro r WHERE r.nombre = s.rubro AND r.pasillo_id = p.id AND r.deleted_at IS NULL
);

-- 3) Subrubros (ligados a su rubro; se ignoran filas sin subrubro)
INSERT INTO subrubro (id, nombre, rubro_id, activo, created_at, updated_at)
SELECT gen_random_uuid()::text, s.subrubro, r.id, true, now(), now()
FROM staging_dia_taxonomia s
JOIN pasillo p ON p.nombre = s.pasillo AND p.deleted_at IS NULL
JOIN rubro r ON r.nombre = s.rubro AND r.pasillo_id = p.id AND r.deleted_at IS NULL
WHERE s.subrubro IS NOT NULL AND trim(s.subrubro) <> ''
AND NOT EXISTS (
  SELECT 1 FROM subrubro sr WHERE sr.nombre = s.subrubro AND sr.rubro_id = r.id AND sr.deleted_at IS NULL
);

-- Reporte
SELECT
  (SELECT count(*) FROM pasillo WHERE deleted_at IS NULL) AS total_pasillos,
  (SELECT count(*) FROM rubro WHERE deleted_at IS NULL) AS total_rubros,
  (SELECT count(*) FROM subrubro WHERE deleted_at IS NULL) AS total_subrubros;

COMMIT;
