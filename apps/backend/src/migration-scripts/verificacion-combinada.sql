-- Verificación combinada: estado general de producto_maestro + desglose de aprobados
-- por origen (DIA vs Supertop). Es de solo lectura (no modifica nada).
--
-- Reutiliza los data.csv que ya están en el servidor de las corridas de update.sql de
-- cada sitio (no hace falta volver a generarlos).
--
-- Uso (en el servidor, desde cualquier directorio, usando paths absolutos):
--   psql "postgres://nexob2b:nexob2b_secure_2026@localhost/nexob2b_db" -f verificacion-combinada.sql

CREATE TEMP TABLE staging_dia_ean (ean text);
\copy staging_dia_ean (ean) FROM '/var/www/nexob2b/nexob2b/apps/backend/src/migration-scripts/update-producto-maestro-dia/data.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

CREATE TEMP TABLE staging_supertop_ean (ean text);
\copy staging_supertop_ean (ean) FROM '/var/www/nexob2b/nexob2b/apps/backend/src/migration-scripts/update-producto-maestro-supertop/data.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- Estado general de toda la tabla
SELECT
  count(*) FILTER (WHERE estado = 'aprobado')  AS aprobados_total,
  count(*) FILTER (WHERE estado = 'pendiente') AS pendientes_total,
  count(*) FILTER (WHERE estado = 'rechazado') AS rechazados_total,
  count(*)                                     AS productos_total
FROM producto_maestro
WHERE deleted_at IS NULL;

-- Desglose de aprobados por origen (DIA vs Supertop vs otros/manuales)
SELECT
  count(*) FILTER (WHERE pm.ean IN (SELECT ean FROM staging_dia_ean))
    AS aprobados_via_dia,
  count(*) FILTER (WHERE pm.ean IN (SELECT ean FROM staging_supertop_ean))
    AS aprobados_via_supertop,
  count(*) FILTER (WHERE pm.ean NOT IN (SELECT ean FROM staging_dia_ean)
                     AND pm.ean NOT IN (SELECT ean FROM staging_supertop_ean))
    AS aprobados_otro_origen,
  count(*) AS aprobados_total
FROM producto_maestro pm
WHERE pm.deleted_at IS NULL
  AND pm.estado = 'aprobado';
