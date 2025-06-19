import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos para las tablas de Supabase
export interface BarberService {
  id: number;
  barber_name: string;
  total: number;
  tip: number;
  payment_method: string;
  notes: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  stock: number;
  buy_price: number;
  sell_price: number;
  created_at: string;
}

export interface Sale {
  id: number;
  product_id: number;
  quantity: number;
  total: number;
  payment_method: string;
  created_at: string;
}

export interface Order {
  id: number;
  client_name: string;
  products: {
    name: string;
    sellPrice: number;
    quantity: number;
  }[];
  beard_service: boolean;
  total: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
} 