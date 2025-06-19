-- Crear tabla para resúmenes semanales
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  barber_earnings JSONB, -- { "barbero1": 100000, "barbero2": 150000 }
  product_sales_total DECIMAL(10,2) DEFAULT 0,
  admin_earnings DECIMAL(10,2) DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_dates ON weekly_summaries(week_start_date, week_end_date); 