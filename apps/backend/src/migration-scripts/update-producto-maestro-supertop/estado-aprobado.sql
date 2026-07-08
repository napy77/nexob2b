-- Pasa a "aprobado" los productos que matchearon con Supertop (categoría/descripción/foto/marca
-- ya cargadas por update.sql en este mismo directorio). Reutiliza el mismo data.csv.
--
-- Solo toca productos que estén en 'pendiente' — no pisa 'rechazado' (si algún admin lo
-- rechazó a mano, este script no lo reabre), y ya no toca los 3.770 que DIA aprobó antes.
--
-- Es idempotente: correrlo de nuevo no rompe nada (los que ya estén en 'aprobado' quedan igual).
--
-- Uso (en el servidor, desde este directorio):
--   psql "postgres://nexob2b:nexob2b_secure_2026@localhost/nexob2b_db" -f estado-aprobado.sql

BEGIN;

CREATE TEMP TABLE staging_supertop_match_ean (
  ean text,
  pasillo text,
  rubro text,
  subrubro text,
  descripcion text,
  marca text,
  imagen_url text,
  nombre_supertop text
);

\copy staging_supertop_match_ean (ean, pasillo, rubro, subrubro, descripcion, marca, imagen_url, nombre_supertop) FROM 'data.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

UPDATE producto_maestro pm
SET estado = 'aprobado',
    updated_at = now()
FROM staging_supertop_match_ean stg
WHERE pm.ean = stg.ean
  AND pm.deleted_at IS NULL
  AND pm.estado = 'pendiente';

-- Reporte
SELECT
  count(*) FILTER (WHERE pm.estado = 'aprobado')  AS aprobados,
  count(*) FILTER (WHERE pm.estado = 'rechazado')  AS rechazados_sin_tocar,
  count(*) FILTER (WHERE pm.estado = 'pendiente')  AS pendientes_restantes,
  count(*)                                         AS total_matcheados
FROM producto_maestro pm
JOIN staging_supertop_match_ean stg ON stg.ean = pm.ean
WHERE pm.deleted_at IS NULL;

COMMIT;
