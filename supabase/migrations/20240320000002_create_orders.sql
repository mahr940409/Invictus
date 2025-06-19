-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    products JSONB NOT NULL,
    beard_service BOOLEAN NOT NULL DEFAULT false,
    beard_service_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    tip DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_is_paid ON orders(is_paid);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Add RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON orders
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for all authenticated users" ON orders
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users" ON orders
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true); 