-- Función para eliminar todos los datos de las tablas
CREATE OR REPLACE FUNCTION delete_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Eliminar en orden para evitar problemas de claves foráneas
  DELETE FROM sales;
  DELETE FROM products;
  DELETE FROM inventory_log;
  DELETE FROM barber_services;
END;
$$; 