-- ================================================================
-- AuthVault — Supabase Schema
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- Tabla de cuentas 2FA
CREATE TABLE accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  issuer        text NOT NULL DEFAULT '',
  secret_encrypted text NOT NULL,  -- cifrado AES-256-GCM en el browser
  emoji         text NOT NULL DEFAULT '🔐',
  created_at    timestamptz DEFAULT now()
);

-- Índice para queries por usuario
CREATE INDEX accounts_user_id_idx ON accounts(user_id);

-- Row Level Security: cada usuario solo ve sus propias cuentas
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);
