-- Import masivo de catalogo maestro (EAN + nombre)
-- Origen: Google Sheet "130mil_final_excel" (pestaña 130mil_final), 65.531 productos limpios
-- Generado: 2026-07-06
--
-- Notas de limpieza ya aplicadas al data.csv:
--   - 2 filas sin EAN se sacaron (quedan en revision_manual_sin_ean.csv, fuera del repo)
--   - 28 filas con 14 digitos (bug de carga, un digito de mas al inicio) se corrigieron a 13
--   - 2 duplicados por EAN se descartaron (se queda la primera aparicion)
--   - 4.019 filas quedan con codigos de menos de 13 digitos: son codigos internos de balanza
--     u otros sistemas, NO son EAN estandar. Se insertan igual (son unicos), pero no van a
--     matchear con Coto/otras fuentes en la fase 2 de fotos+descripcion.
--   - 2.497 filas son codigos "tipo balanza" (empiezan en 2, 13 digitos): productos pesables,
--     el codigo embebe peso/precio y es propio de quien lo genero. Mismo caveat que arriba.
--
-- Uso (correr en el servidor, con el usuario nexob2b, desde este mismo directorio):
--   psql "postgres://nexob2b:nexob2b_secure_2026@localhost/nexob2b_db" -f import.sql

BEGIN;

CREATE TEMP TABLE staging_producto_maestro (
  ean text,
  nombre text
);

\copy staging_producto_maestro (ean, nombre) FROM 'data.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- Solo inserta los que todavia no existen en producto_maestro (por ean).
-- estado = 'pendiente': no quedan visibles/activos hasta completarles descripcion y foto.
INSERT INTO producto_maestro (id, ean, nombre, unidad_base, alicuota_iva, estado, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  s.ean,
  s.nombre,
  'unidad',
  21,
  'pendiente',
  now(),
  now()
FROM staging_producto_maestro s
WHERE s.ean IS NOT NULL AND s.ean <> ''
ON CONFLICT (ean) WHERE ean IS NOT NULL AND deleted_at IS NULL DO NOTHING;

-- Reporte
SELECT
  (SELECT count(*) FROM staging_producto_maestro) AS filas_en_csv,
  (SELECT count(*) FROM producto_maestro WHERE estado = 'pendiente') AS total_pendientes_en_tabla;

COMMIT;
