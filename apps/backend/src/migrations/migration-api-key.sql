-- Migration: tabla api_key para integración NexoPOS y sistemas de mayoristas
-- Ejecutar en producción: psql "postgres://nexob2b:nexob2b_secure_2026@localhost/nexob2b_db" -f migration-api-key.sql

CREATE TABLE IF NOT EXISTS api_key (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key         TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('nexopos', 'mayorista')),
  entidad_id  TEXT NOT NULL,   -- comercio_id (nexopos) | mayorista_id (mayorista)
  activa      BOOLEAN NOT NULL DEFAULT true,
  webhook_url TEXT,            -- URL donde se notifican nuevas órdenes (mayorista)
  ultimo_uso  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_key_key        ON api_key(key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_key_entidad    ON api_key(entidad_id, tipo) WHERE deleted_at IS NULL;
