-- Enriquecimiento de producto_maestro con datos de Supermercados TOP (categoría, descripción, foto, marca)
-- + aprobación en el mismo paso.
-- Origen: matching exacto por EAN contra la API de Supertop (VTEX)
--   https://www.supertop.com.ar/api/catalog_system/pub/products/search?fq=alternateIds_Ean:{EAN}
-- Corrido sobre los 60.152 EAN que quedaron en estado='pendiente' luego del barrido de DIA
-- (ver update-producto-maestro-dia/). 2.479 tuvieron match en Supertop (4.12%).
--
-- Este script actualiza SOLO los 2.479 productos con match. La taxonomía pasillo/rubro/subrubro
-- viene del árbol de categorías propio de Supertop (VTEX), que NO es el mismo que el de DIA -- por
-- eso el LEFT JOIN puede no calzar para muchos productos. Igual se actualiza descripcion/marca/
-- imagen_url aunque no calce la categoría (ver reporte al final para ver cuántos quedaron sin
-- pasillo/rubro/subrubro resuelto).
--
-- A diferencia del flujo de DIA (que usaba un segundo script estado-aprobado.sql separado), acá
-- el cambio de estado a 'aprobado' va en el mismo UPDATE: solo se aplica a los que estén en
-- 'pendiente' (no pisa 'rechazado' si algún admin lo rechazó a mano).
--
-- Es idempotente: usa COALESCE para no pisar valores que ya estén cargados (manual o de una
-- corrida anterior de este mismo script, o ya cargados por el update.sql de DIA) — solo completa
-- lo que esté NULL o vacío. Correrlo de nuevo no rompe nada. Si querés forzar sobreescritura total
-- de categoría/descripción/marca/foto, cambiá los COALESCE(...) por el valor de staging directamente.
--
-- Uso (en el servidor, desde este directorio):
--   psql "postgres://nexob2b:nexob2b_secure_2026@localhost/nexob2b_db" -f update.sql

BEGIN;

-- Por si imagen_url no llegó a existir vía migración committeada (mismo caso que en DIA).
-- Operación idempotente y segura, no hace nada si la columna ya existe.
ALTER TABLE producto_maestro ADD COLUMN IF NOT EXISTS imagen_url text NULL;

CREATE TEMP TABLE staging_supertop_match (
  ean text,
  pasillo text,
  rubro text,
  subrubro text,
  descripcion text,
  marca text,
  imagen_url text,
  nombre_supertop text
);

\copy staging_supertop_match (ean, pasillo, rubro, subrubro, descripcion, marca, imagen_url, nombre_supertop) FROM 'data.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- Resolvemos pasillo/rubro/subrubro por nombre (LEFT JOIN: si algún nombre no calza contra la
-- taxonomía ya importada -árbol de DIA-, igual actualizamos descripcion/marca/imagen_url) y
-- aprobamos en el mismo paso (solo los que estaban 'pendiente').
UPDATE producto_maestro pm
SET
  pasillo_id   = COALESCE(pm.pasillo_id, p.id),
  rubro_id     = COALESCE(pm.rubro_id, r.id),
  subrubro_id  = COALESCE(pm.subrubro_id, sr.id),
  descripcion  = COALESCE(NULLIF(pm.descripcion, ''), stg.descripcion),
  marca        = COALESCE(NULLIF(pm.marca, ''), stg.marca),
  imagen_url   = COALESCE(NULLIF(pm.imagen_url, ''), stg.imagen_url),
  estado       = CASE WHEN pm.estado = 'pendiente' THEN 'aprobado' ELSE pm.estado END,
  updated_at   = now()
FROM staging_supertop_match stg
LEFT JOIN pasillo p
  ON p.nombre = stg.pasillo AND p.deleted_at IS NULL
LEFT JOIN rubro r
  ON r.nombre = stg.rubro AND r.pasillo_id = p.id AND r.deleted_at IS NULL
LEFT JOIN subrubro sr
  ON sr.nombre = stg.subrubro AND sr.rubro_id = r.id AND sr.deleted_at IS NULL
  AND stg.subrubro IS NOT NULL AND trim(stg.subrubro) <> ''
WHERE pm.ean = stg.ean
  AND pm.deleted_at IS NULL;

-- Reporte: categoría resuelta + estado final de los matcheados
SELECT
  count(*) FILTER (WHERE pm.pasillo_id IS NOT NULL)                    AS con_pasillo,
  count(*) FILTER (WHERE pm.rubro_id IS NOT NULL)                      AS con_rubro,
  count(*) FILTER (WHERE pm.subrubro_id IS NOT NULL)                   AS con_subrubro,
  count(*) FILTER (WHERE pm.imagen_url IS NOT NULL AND pm.imagen_url <> '') AS con_imagen,
  count(*) FILTER (WHERE pm.estado = 'aprobado')                       AS aprobados,
  count(*) FILTER (WHERE pm.estado = 'rechazado')                      AS rechazados_sin_tocar,
  count(*) FILTER (WHERE pm.estado = 'pendiente')                      AS pendientes_restantes,
  count(*)                                                             AS total_matcheados
FROM producto_maestro pm
JOIN staging_supertop_match stg ON stg.ean = pm.ean
WHERE pm.deleted_at IS NULL;

COMMIT;
