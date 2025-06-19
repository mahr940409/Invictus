-- Agregar columna user_name a la tabla sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Agregar columna user_name a la tabla inventory_log
ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS user_name TEXT; 