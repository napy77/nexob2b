-- Enriquecimiento de producto_maestro con datos de DIA Online (categoría, descripción, foto, marca)
-- Origen: matching exacto por EAN contra la API de DIA
--   https://diaonline.supermercadosdia.com.ar/api/catalog_system/pub/products/search?fq=alternateIds_Ean:{EAN}
-- Corrido sobre 65.118 EAN únicos de producto_maestro (de ~65.531 totales, la diferencia son
-- duplicados que ya venían en el CSV origen). 3.770 tuvieron match en DIA (5.79%).
--
-- Este script actualiza SOLO los 3.770 productos con match, usando la taxonomía Pasillo/Rubro/
-- Subrubro ya importada en import-taxonomia-dia/import.sql (mismo origen: DIA category tree),
-- por lo que los nombres deberían calzar exactos.
--
-- Es idempotente: usa COALESCE para no pisar valores que ya estén cargados (manual o de una
-- corrida anterior de este mismo script) — solo completa lo que esté NULL o vacío. Si querés
-- forzar sobreescritura total, cambiá los COALESCE(...) por el valor de staging directamente
-- (ver comentario "OVERWRITE" más abajo).
--
-- REQUISITO PREVIO: correr antes import-taxonomia-dia/import.sql (pasillo/rubro/subrubro ya
-- deben existir con los mismos nombres que vienen de DIA).
--
-- Uso (en el servidor, desde este directorio):
--   psql "postgres://nexob2b:nexob2b_secure_2026@localhost/nexob2b_db" -f update.sql

BEGIN;

-- Por si imagen_url no llegó a existir vía migración committeada (ver nota de investigación:
-- el modelo Medusa la declara pero no aparece en el migration file checkeado). Operación
-- idempotente y segura, no hace nada si la columna ya existe.
ALTER TABLE producto_maestro ADD COLUMN IF NOT EXISTS imagen_url text NULL;

CREATE TEMP TABLE staging_dia_match (
  ean text,
  pasillo text,
  rubro text,
  subrubro text,
  descripcion text,
  marca text,
  imagen_url text,
  nombre_dia text
);

\copy staging_dia_match (ean, pasillo, rubro, subrubro, descripcion, marca, imagen_url, nombre_dia) FROM 'data.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- Resolvemos pasillo/rubro/subrubro por nombre (LEFT JOIN: si algún nombre no calza contra la
-- taxonomía ya importada, igual actualizamos descripcion/marca/imagen_url del producto).
UPDATE producto_maestro pm
SET
  pasillo_id   = COALESCE(pm.pasillo_id, p.id),
  rubro_id     = COALESCE(pm.rubro_id, r.id),
  subrubro_id  = COALESCE(pm.subrubro_id, sr.id),
  descripcion  = COALESCE(NULLIF(pm.descripcion, ''), stg.descripcion),
  marca        = COALESCE(NULLIF(pm.marca, ''), stg.marca),
  imagen_url   = COALESCE(NULLIF(pm.imagen_url, ''), stg.imagen_url),
  updated_at   = now()
FROM staging_dia_match stg
LEFT JOIN pasillo p
  ON p.nombre = stg.pasillo AND p.deleted_at IS NULL
LEFT JOIN rubro r
  ON r.nombre = stg.rubro AND r.pasillo_id = p.id AND r.deleted_at IS NULL
LEFT JOIN subrubro sr
  ON sr.nombre = stg.subrubro AND sr.rubro_id = r.id AND sr.deleted_at IS NULL
  AND stg.subrubro IS NOT NULL AND trim(stg.subrubro) <> ''
WHERE pm.ean = stg.ean
  AND pm.deleted_at IS NULL;

-- Reporte: cuántos productos quedaron con categoría resuelta vs. sin resolver (nombre DIA no
-- calzó contra pasillo/rubro/subrubro ya importados — revisar manualmente si el número es alto)
SELECT
  count(*) FILTER (WHERE pm.pasillo_id IS NOT NULL)                    AS con_pasillo,
  count(*) FILTER (WHERE pm.rubro_id IS NOT NULL)                      AS con_rubro,
  count(*) FILTER (WHERE pm.subrubro_id IS NOT NULL)                   AS con_subrubro,
  count(*) FILTER (WHERE pm.imagen_url IS NOT NULL AND pm.imagen_url <> '') AS con_imagen,
  count(*)                                                             AS total_matcheados
FROM producto_maestro pm
JOIN staging_dia_match stg ON stg.ean = pm.ean
WHERE pm.deleted_at IS NULL;

COMMIT;
