import React, { useState } from 'react';
import { ProductLot } from './Inventory';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/supabase';
import type { AppSale } from '../types';

interface Props {
  products: ProductLot[];
  setProducts: React.Dispatch<React.SetStateAction<ProductLot[]>>;
  sales: AppSale[];
  setSales: React.Dispatch<React.SetStateAction<AppSale[]>>;
  isAdmin?: boolean;
}

const logInventoryAction = async (action_type: string, product_name: string, quantity: number, user_name: string, details: string = '') => {
  await supabase.from('inventory_log').insert([
    { action_type, product_name, quantity, user_name, details }
  ]);
};

const SellProduct: React.FC<Props> = ({ products, setProducts, sales, setSales, isAdmin }) => {
  const [selectedName, setSelectedName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');

  const formatCOP = (value: number) => value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Productos únicos en inventario
  const productOptions = Array.from(new Set(products.map(p => p.name)));

  // Ganancia total solo de ventas realizadas
  const totalProfit = sales.reduce((acc, s) => acc + (s.sellPrice - s.buyPrice) * s.quantity, 0);

  // Stock total disponible para el producto buscado
  const totalStock = products.filter(p => p.name.toLowerCase() === selectedName.toLowerCase()).reduce((acc, p) => acc + p.quantity, 0);

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!selectedName) return;
    if (isNaN(qty) || qty <= 0) {
      setMessage('Cantidad inválida');
      return;
    }
    // Sumar stock de todos los lotes
    const available = products.filter(p => p.name.toLowerCase() === selectedName.toLowerCase()).reduce((acc, p) => acc + p.quantity, 0);
    if (available < qty) {
      setMessage('No hay unidades suficientes en inventario');
      return;
    }
    // Descontar del lote más antiguo (FIFO)
    let toSell = qty;
    let updatedProducts = [...products];
    let salesToAdd: AppSale[] = [];
    for (let i = 0; i < updatedProducts.length && toSell > 0; i++) {
      const p = updatedProducts[i];
      if (p.name.toLowerCase() === selectedName.toLowerCase() && p.quantity > 0) {
        const sellQty = Math.min(p.quantity, toSell);
        updatedProducts[i] = { ...p, quantity: p.quantity - sellQty };
        salesToAdd.push({
          name: p.name,
          quantity: sellQty,
          buyPrice: p.buyPrice,
          sellPrice: p.sellPrice,
          total: sellQty * p.sellPrice,
          payment_method: isAdmin ? 'Efectivo' : 'Efectivo',
          timestamp: new Date(),
        });
        // Actualizar stock en Supabase
        // Buscar el producto en Supabase
        console.log('Buscando producto en Supabase:', p.name);
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('id, stock')
          .eq('name', p.name)
          .eq('buy_price', p.buyPrice)
          .eq('sell_price', p.sellPrice)
          .limit(1)
          .single();
        if (prodError || !prodData) {
          console.error('Error buscando producto:', prodError);
          setMessage('Error actualizando inventario en base de datos');
          continue;
        }
        console.log('Producto encontrado:', prodData);
        const newStock = prodData.stock - sellQty;
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', prodData.id);
        if (updateError) {
          console.error('Error actualizando stock:', updateError);
          setMessage('Error actualizando inventario en base de datos');
          continue;
        }
        // Registrar la venta en Supabase
        console.log('Registrando venta en Supabase:', {
          product_id: prodData.id,
          quantity: sellQty,
          total: sellQty * p.sellPrice,
          user_name: isAdmin ? 'Luis Paez' : 'Auxiliar'
        });
        const { error: saleError } = await supabase.from('sales').insert([
          {
            product_id: prodData.id,
            quantity: sellQty,
            total: sellQty * p.sellPrice,
            user_name: isAdmin ? 'Luis Paez' : 'Auxiliar'
          }
        ]);
        if (saleError) {
          console.error('Error registrando venta:', saleError);
          setMessage('Error registrando la venta');
          continue;
        }
        console.log('Venta registrada correctamente');
        await logInventoryAction(
          'vender', 
          p.name, 
          sellQty, 
          isAdmin ? 'Luis Paez' : 'Auxiliar',
          `Venta realizada - Total: $${formatCOP(sellQty * p.sellPrice)}`
        );
        toSell -= sellQty;
      }
    }
    setProducts(updatedProducts);
    setSales(prev => [...prev, ...salesToAdd]);
    setMessage(`Venta realizada: ${qty} x ${selectedName}`);
    setQuantity('');
    setSelectedName('');
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', fontFamily: 'sans-serif', position: 'relative' }}>
      <h2 style={{ marginBottom: 24 }}>Vender producto
        {isAdmin && (
          <span style={{ float: 'right', fontSize: 16, color: '#007bff', fontWeight: 'bold' }}>
            Ganancia total: ${formatCOP(totalProfit)}
          </span>
        )}
      </h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={selectedName} onChange={e => setSelectedName(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">Seleccione producto...</option>
          {productOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
      {selectedName && (
        <form onSubmit={handleSell} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <div><strong>{selectedName}</strong> | En inventario: {totalStock}</div>
          <input
            type="number"
            placeholder="Cantidad a vender"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="1"
            max={totalStock}
            required
          />
          <button type="submit">Vender</button>
        </form>
      )}
      {message && <div style={{ color: message.startsWith('Venta realizada') ? 'green' : 'red', marginTop: 8 }}>{message}</div>}
    </div>
  );
};

export default SellProduct; 