import React from 'react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';

export interface ProductLot {
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  timestamp: Date;
}

interface InventoryProps {
  products: ProductLot[];
  onAdd: (product: Omit<ProductLot, 'timestamp'>) => void;
  onRemove: (index: number) => void;
  isAdmin?: boolean;
  productList: { name: string; sellPrice: number }[];
  onEditProductSellPrice: (name: string, newSellPrice: number) => void;
  onAddProductToList: (name: string, sellPrice: number) => void;
  isAux?: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ products, onAdd, onRemove, isAdmin, productList, onEditProductSellPrice, onAddProductToList, isAux }) => {
  const [name, setName] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [buyPrice, setBuyPrice] = React.useState('');
  const [sellPrice, setSellPrice] = React.useState('');
  const [error, setError] = React.useState('');
  const [editProduct, setEditProduct] = React.useState<string | null>(null);
  const [editSellPrice, setEditSellPrice] = React.useState('');
  const [addingNewProduct, setAddingNewProduct] = React.useState(false);
  const [success, setSuccess] = React.useState('');
  const [mode, setMode] = React.useState<'formulario' | 'inventario'>('formulario');
  const [search, setSearch] = React.useState('');
  const [newProductName, setNewProductName] = React.useState('');

  const formatCOP = (value: number) => value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const productName = name === '__nuevo__' ? newProductName : name;
    const qty = Number(quantity);
    const buyTotal = Number(buyPrice);
    if (!productName.trim() || isNaN(qty) || qty <= 0 || isNaN(buyTotal) || buyTotal < 0) {
      setError('Todos los campos son obligatorios y deben ser válidos');
      return;
    }
    const buyUnit = buyTotal / qty;
    let sell = sellPrice;
    const productInList = productList.find(p => p.name === productName.trim());
    if (productInList) {
      sell = String(productInList.sellPrice);
    } else if (!sellPrice) {
      setError('Debe ingresar el valor de venta para un producto nuevo');
      return;
    } else {
      onAddProductToList(productName.trim(), Number(sellPrice));
      setSuccess(`Producto "${productName.trim()}" agregado correctamente al listado.`);
      setTimeout(() => setSuccess(''), 3000);
    }
    onAdd({ name: productName.trim(), quantity: qty, buyPrice: buyUnit, sellPrice: Number(sell) });
    
    // Registrar la acción en el log
    await supabase.from('inventory_log').insert({
      action_type: 'agregar',
      product_name: productName.trim(),
      quantity: qty,
      details: `Precio compra: $${formatCOP(buyUnit)}, Precio venta: $${formatCOP(Number(sell))}`,
      user_name: isAdmin ? 'Luis Paez' : 'Auxiliar'
    });

    setName('');
    setNewProductName('');
    setQuantity('');
    setBuyPrice('');
    setSellPrice('');
    setError('');
    setAddingNewProduct(false);
  };

  const handleEditSellPrice = (name: string, price: string) => {
    setEditProduct(name);
    setEditSellPrice(price);
  };

  const handleSaveSellPrice = (name: string) => {
    const price = Number(editSellPrice);
    if (isNaN(price) || price < 0) return;
    onEditProductSellPrice(name, price);
    setEditProduct(null);
    setEditSellPrice('');
  };

  const handleAddProductToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sellPrice) return;
    onAddProductToList(name.trim(), Number(sellPrice));
    setAddingNewProduct(false);
    setSellPrice('');
  };

  const productExists = !!productList.find(p => p.name === name.trim());

  // Agrupar productos por nombre y sumar cantidades
  const groupedProducts = products.reduce<Record<string, { quantity: number; buyPrice: number; sellPrice: number; lastTimestamp: Date }>>((acc, p) => {
    if (!acc[p.name]) {
      acc[p.name] = { quantity: 0, buyPrice: p.buyPrice, sellPrice: p.sellPrice, lastTimestamp: p.timestamp };
    }
    acc[p.name].quantity += p.quantity;
    if (p.timestamp > acc[p.name].lastTimestamp) {
      acc[p.name].lastTimestamp = p.timestamp;
    }
    return acc;
  }, {});

  // Filtrar y ordenar productos alfabéticamente
  const filteredProductNames = Object.keys(groupedProducts)
    .filter(name => name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="card" style={{ maxWidth: 700, width: '100%', margin: '2rem auto', background: 'var(--white)', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
        <button type="button" className="btn" style={{ background: mode === 'formulario' ? 'var(--gold)' : 'var(--black)', color: mode === 'formulario' ? 'var(--black)' : 'var(--gold)' }} onClick={() => setMode('formulario')}>Formulario</button>
        <button type="button" className="btn" style={{ background: mode === 'inventario' ? 'var(--gold)' : 'var(--black)', color: mode === 'inventario' ? 'var(--black)' : 'var(--gold)' }} onClick={() => setMode('inventario')}>Inventario</button>
      </div>
      {mode === 'formulario' && (
        <>
          <h2 style={{ color: 'var(--black)', textAlign: 'center', marginBottom: 24 }}>Agregar producto o lote</h2>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 500, margin: '0 auto' }}>
            {productList.length > 0 ? (
              <>
                <select value={name} onChange={e => setName(e.target.value)} required className="select" style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="">Seleccione producto...</option>
                  {productList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  <option value="__nuevo__">Agregar nuevo producto...</option>
                </select>
                {name === "__nuevo__" && (
                  <input
                    type="text"
                    placeholder="Nombre del nuevo producto"
                    value={newProductName}
                    onChange={e => setNewProductName(e.target.value)}
                    required
                    className="input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                placeholder="Nombre del producto"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            )}
            <input
              type="number"
              placeholder="Cantidad"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="1"
              required
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            <input
              type="number"
              placeholder="Valor venta (por unidad)"
              value={sellPrice}
              onChange={e => setSellPrice(e.target.value)}
              min="0"
              required
              className="input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            <button type="submit" className="btn" style={{ width: '100%' }}>Agregar lote</button>
          </form>
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginBottom: 8 }}>{success}</div>}
        </>
      )}
      {mode === 'inventario' && (
        <>
          <h2 style={{ color: 'var(--black)', textAlign: 'center', marginBottom: 24 }}>Inventario de productos</h2>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ maxWidth: 300 }}
            />
          </div>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
              <thead>
                <tr style={{ background: 'var(--black)', color: 'var(--gold)' }}>
                  <th style={{ padding: 8, borderRadius: 8, textAlign: 'left' }}>Producto</th>
                  <th style={{ padding: 8, borderRadius: 8, textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: 8, borderRadius: 8, textAlign: 'center' }}>Valor compra</th>
                  <th style={{ padding: 8, borderRadius: 8, textAlign: 'center' }}>Valor venta</th>
                  <th style={{ padding: 8, borderRadius: 8, textAlign: 'center' }}>Último ingreso</th>
                  {isAdmin && <th style={{ padding: 8, borderRadius: 8, textAlign: 'center' }}>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProductNames.length === 0 && (
                  <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: 16 }}>No hay productos en inventario.</td></tr>
                )}
                {filteredProductNames.map((prodName) => {
                  const p = groupedProducts[prodName];
                  let color = 'var(--gold)';
                  if (p.quantity <= 2) color = '#e74c3c';
                  else if (p.quantity <= 6) color = '#f1c40f';
                  else color = '#27ae60';
                  return (
                    <tr key={prodName} style={{ background: 'var(--white)' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{prodName}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', minWidth: 32, fontWeight: 700, color }}>{p.quantity}</span>
                        <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: color, marginLeft: 8, verticalAlign: 'middle' }}></span>
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>${formatCOP(p.buyPrice)}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>${formatCOP(p.sellPrice)}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.lastTimestamp.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td>
                      {isAdmin && (
                        <td style={{ padding: 8, textAlign: 'center' }}>
                          <button onClick={() => {
                            const idx = products.findIndex(prod => prod.name === prodName);
                            if (idx !== -1) onRemove(idx);
                          }} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 13 }}>Quitar</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Inventory; 