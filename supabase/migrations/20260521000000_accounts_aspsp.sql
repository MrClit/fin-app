-- Banco (ASPSP) de origen de las cuentas Enable Banking.
-- Se guarda para poder renovar el consentimiento PSD2 sin que el usuario
-- vuelva a seleccionar el banco (issue #79, spec §9.4).
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS aspsp_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS aspsp_country TEXT;
