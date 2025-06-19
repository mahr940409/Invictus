-- Corregir la función delete_all_data para mejorar la seguridad
CREATE OR REPLACE FUNCTION delete_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Eliminar en orden para evitar problemas de claves foráneas
  DELETE FROM sales;
  DELETE FROM products;
  DELETE FROM inventory_log;
  DELETE FROM barber_services;
END;
$$; 