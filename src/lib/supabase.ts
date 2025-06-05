import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  buy_price: number;
  sell_price: number;
  stock: number;
  created_at: string;
}

export interface Sale {
  id: number;
  product_id: number;
  quantity: number;
  total: number;
  created_at: string;
} 