-- Asegurar que la tabla inventory_log tenga la estructura correcta
CREATE TABLE IF NOT EXISTS inventory_log (
    id BIGSERIAL PRIMARY KEY,
    action_type TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    user_name TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS inventory_log_created_at_idx ON inventory_log(created_at);
CREATE INDEX IF NOT EXISTS inventory_log_action_type_idx ON inventory_log(action_type);
CREATE INDEX IF NOT EXISTS inventory_log_product_name_idx ON inventory_log(product_name); 