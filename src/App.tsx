import React, { useState, useEffect } from 'react';
import BarberForm from './components/BarberForm';
import Inventory, { ProductLot } from './components/Inventory';
import SellProduct from './components/SellProduct';
import History from './components/History';
import logo from '../public/logo.png';
import { supabase } from './lib/supabase';
import type { BarberService, Product, Sale } from './lib/supabase';
import jsPDF from 'jspdf';

export interface Result {
  barber: number;
  admin: number;
  tip: number;
  total: number;
  barberName: string;
  payment_method: string;
  timestamp?: Date;
}

export interface AppSale {
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  total: number;
  payment_method: string;
  timestamp: Date;
}

const USERS = [
  { user: 'admin', pass: '1234', role: 'admin' },
  { user: 'auxiliar', pass: '1234', role: 'aux' },
];
const BARBERS = ['Barbero 1', 'Barbero 2', 'Barbero 3', 'Barbero 4'];

const TABS = [
  { key: 'main', label: 'Formulario y Ganancias', roles: ['admin', 'aux'] },
  { key: 'registros', label: 'Listado de registros', roles: ['admin'] },
  { key: 'inventory', label: 'Inventario', roles: ['admin', 'aux'] },
  { key: 'venta', label: 'Vender producto', roles: ['admin', 'aux'] },
  { key: 'historial', label: 'Historial', roles: ['admin'] },
];

type TabKey = 'main' | 'registros' | 'inventory' | 'venta' | 'historial';

const PRODUCT_LIST: { name: string; sellPrice: number }[] = [];

const App: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'aux' | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<TabKey>('main');
  const [filterBarber, setFilterBarber] = useState<string>('');
  const [products, setProducts] = useState<ProductLot[]>([]);
  const [sales, setSales] = useState<AppSale[]>([]);
  const [productList, setProductList] = useState(PRODUCT_LIST);
  const [mainTab, setMainTab] = useState<'formulario' | 'barberos'>('formulario');

  // Cargar servicios de barbería al iniciar
  useEffect(() => {
    const loadBarberServices = async () => {
      const { data, error } = await supabase
        .from('barber_services')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error cargando servicios:', error);
        return;
      }
      if (data) {
        const formattedResults = data.map((service: BarberService) => ({
          barber: service.total * 0.5 + service.tip,
          admin: service.total * 0.5,
          tip: service.tip,
          total: service.total,
          barberName: service.barber_name,
          payment_method: service.payment_method,
          timestamp: new Date(service.created_at)
        }));
        setResults(formattedResults);
      }
    };
    loadBarberServices();
  }, []);

  // Cargar productos desde Supabase al iniciar
  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        console.error('Error cargando productos:', error);
        return;
      }
      if (data) {
        // Mapear a ProductLot para el estado de productos
        const lots = data.map((prod: Product) => ({
          name: prod.name,
          quantity: prod.stock,
          buyPrice: prod.buy_price,
          sellPrice: prod.sell_price,
          timestamp: new Date(prod.created_at)
        }));
        setProducts(lots);
        // Para el listado de productos (nombre y precio de venta)
        setProductList(data.map((prod: Product) => ({ name: prod.name, sellPrice: prod.sell_price })));
      }
    };
    loadProducts();
  }, []);

  // Cargar ventas desde Supabase al iniciar
  useEffect(() => {
    const loadSales = async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, product_id (name, buy_price, sell_price)')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error cargando ventas:', error);
        return;
      }
      if (data) {
        // Mapear ventas a formato local
        const mapped = data.map((sale: any) => ({
          name: sale.product_id?.name || '',
          quantity: sale.quantity,
          buyPrice: sale.product_id?.buy_price || 0,
          sellPrice: sale.product_id?.sell_price || 0,
          total: sale.total,
          payment_method: sale.payment_method,
          timestamp: new Date(sale.created_at)
        }));
        setSales(mapped);
      }
    };
    loadSales();
  }, []);

  // Utilidad para formatear moneda colombiana
  const formatCOP = (value: number) => value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = USERS.find(u => u.user === loginUser && u.pass === loginPass);
    if (found) {
      setUser(found.user);
      setRole(found.role as 'admin' | 'aux');
      setLoginError('');
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    setLoginUser('');
    setLoginPass('');
    setTab('main');
  };

  const handleCalculate = async (data: Omit<Result, 'barberName' | 'timestamp'> & { barberName: string }) => {
    const now = new Date();
    const bogotaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    
    // Guardar en Supabase
    const { error } = await supabase
      .from('barber_services')
      .insert([
        {
          barber_name: data.barberName,
          total: data.total,
          tip: data.tip,
          payment_method: 'Efectivo', // TODO: Agregar método de pago al formulario
          notes: '', // TODO: Agregar notas al formulario
        }
      ]);

    if (error) {
      console.error('Error guardando servicio:', error);
      return;
    }

    setResults(prev => [...prev, { ...data, timestamp: bogotaTime }]);
  };

  const getTotalByBarber = (name: string) => {
    return results.filter(r => r.barberName === name).reduce((acc, r) => acc + r.barber, 0);
  };

  const logInventoryAction = async (action_type: string, product_name: string, quantity: number, user_name: string, details: string = '') => {
    await supabase.from('inventory_log').insert([
      { action_type, product_name, quantity, user_name, details }
    ]);
  };

  // Handlers para inventario
  const handleAddProduct = async (prod: Omit<ProductLot, 'timestamp'>) => {
    // Guardar en Supabase
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name: prod.name,
          stock: prod.quantity,
          buy_price: prod.buyPrice,
          sell_price: prod.sellPrice,
        }
      ])
      .select();
    if (error) {
      alert('Error al guardar producto: ' + error.message);
      return;
    }
    if (data && data.length > 0) {
      setProducts(prev => [...prev, {
        ...prod,
        timestamp: new Date(data[0].created_at)
      }]);
      setProductList(prev => {
        if (!prev.find(p => p.name === prod.name)) {
          return [...prev, { name: prod.name, sellPrice: prod.sellPrice }];
        }
        return prev;
      });
      await logInventoryAction('agregar', prod.name, prod.quantity, user || '', 'Agregado al inventario');
    }
  };

  const handleRemoveProduct = async (index: number) => {
    const prod = products[index];
    // Buscar el producto en Supabase por nombre y stock
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('name', prod.name)
      .eq('stock', prod.quantity)
      .eq('buy_price', prod.buyPrice)
      .eq('sell_price', prod.sellPrice)
      .limit(1)
      .single();
    if (error || !data) {
      alert('No se pudo encontrar el producto en la base de datos para eliminarlo.');
      return;
    }
    const { error: delError } = await supabase
      .from('products')
      .delete()
      .eq('id', data.id);
    if (delError) {
      alert('Error al eliminar producto: ' + delError.message);
      return;
    }
    setProducts(prev => prev.filter((_, i) => i !== index));
    await logInventoryAction('quitar', prod.name, prod.quantity, user || '', 'Lote eliminado del inventario');
  };

  const handleEditProductSellPrice = async (name: string, newSellPrice: number) => {
    // Actualizar en Supabase todos los productos con ese nombre
    const { error } = await supabase
      .from('products')
      .update({ sell_price: newSellPrice })
      .eq('name', name);
    if (error) {
      alert('Error al actualizar precio de venta: ' + error.message);
      return;
    }
    setProductList(prev => prev.map(p => p.name === name ? { ...p, sellPrice: newSellPrice } : p));
    setProducts(prev => prev.map(l => l.name === name ? { ...l, sellPrice: newSellPrice } : l));
    await logInventoryAction('editar', name, 0, user || '', `Nuevo precio de venta: ${newSellPrice}`);
  };

  const handleAddProductToList = (name: string, sellPrice: number) => {
    setProductList(prev => [...prev, { name, sellPrice }]);
  };

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fffbe6 0%, #f5f5f5 100%)',
      }}>
        <div className="card" style={{
          width: '100%',
          maxWidth: 370,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}>
          <img src={logo} alt="Logo Invictus" className="logo" style={{ marginBottom: 24 }} />
          <form onSubmit={handleLogin} style={{ width: '100%' }}>
            <div style={{ marginBottom: 18, width: '100%' }}>
              <input
                placeholder="Usuario"
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                required
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <input
                placeholder="Contraseña"
                type="password"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                required
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <button type="submit" className="btn" style={{ width: '100%' }}>
              Iniciar sesión
            </button>
            {loginError && <div style={{ color: '#c0392b', marginTop: 10, textAlign: 'center' }}>{loginError}</div>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)' }}>
            {user === 'admin' ? 'Luis Paez' : user}
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <img src={logo} alt="Logo Invictus" className="logo" style={{ width: 90, height: 'auto', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleLogout} className="btn" style={{ background: 'var(--black)', color: 'var(--gold)', fontWeight: 600, fontSize: 16, padding: '10px 24px' }}>Cerrar sesión</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        {TABS.filter(t => t.roles.includes(role!)).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as TabKey)}
            className="btn"
            style={{
              background: tab === t.key ? 'var(--gold)' : 'var(--black)',
              color: tab === t.key ? 'var(--black)' : 'var(--gold)',
              border: tab === t.key ? '2px solid var(--gold-dark)' : '2px solid var(--black)',
              fontWeight: tab === t.key ? 700 : 600,
              minWidth: 140,
              fontSize: 17,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'main' && (
        <div style={{ maxWidth: 500, margin: '0 auto', background: 'var(--white)', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.5rem 1.2rem' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
            <button
              className="btn"
              style={{ background: mainTab === 'formulario' ? 'var(--gold)' : 'var(--black)', color: mainTab === 'formulario' ? 'var(--black)' : 'var(--gold)', minWidth: 120 }}
              onClick={() => setMainTab('formulario')}
            >
              Formulario
            </button>
            <button
              className="btn"
              style={{ background: mainTab === 'barberos' ? 'var(--gold)' : 'var(--black)', color: mainTab === 'barberos' ? 'var(--black)' : 'var(--gold)', minWidth: 120 }}
              onClick={() => setMainTab('barberos')}
            >
              Barberos
            </button>
          </div>
          {mainTab === 'formulario' && <BarberForm onCalculate={handleCalculate} />}
          {mainTab === 'barberos' && (
            <div className="barberos-grid" style={{ width: '100%' }}>
              {BARBERS.map(barber => (
                <div key={barber} style={{ border: '1.5px solid #ccc', borderRadius: 16, padding: 32, minWidth: 0, minHeight: 120, background: '#f9f9f9', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '90%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 'auto' }}>
                  <h3 style={{ margin: 0, fontSize: 22 }}>{barber}</h3>
                  <p style={{ fontSize: 28, fontWeight: 'bold', margin: '18px 0 0 0', color: 'var(--gold)' }}>
                    ${formatCOP(getTotalByBarber(barber))}
                  </p>
                </div>
              ))}
              {/* Cuadro especial para Productos Barbería */}
              <div style={{ border: '2px solid #007bff', borderRadius: 16, padding: 32, minWidth: 0, minHeight: 120, background: '#eaf3ff', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: '90%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 'auto' }}>
                <h3 style={{ margin: 0, color: '#007bff', fontSize: 22 }}>Productos Barbería</h3>
                <p style={{ fontSize: 18, margin: '18px 0 0 0', color: '#007bff', fontWeight: 600 }}>
                  Total vendidos: {sales.reduce((acc, s) => acc + s.quantity, 0)}
                </p>
                <p style={{ fontSize: 22, fontWeight: 'bold', margin: '8px 0 0 0', color: '#007bff' }}>
                  ${formatCOP(sales.reduce((acc, s) => acc + s.quantity * s.sellPrice, 0))}
                </p>
              </div>
              {role === 'admin' && (
                <div style={{ border: '2.5px solid var(--gold)', borderRadius: 16, padding: 32, minWidth: 0, minHeight: 120, background: '#fffbe6', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: '90%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 'auto' }}>
                  <h3 style={{ margin: 0, color: 'var(--gold)', fontSize: 22 }}>Administrador</h3>
                  <p style={{ fontSize: 28, fontWeight: 'bold', margin: '18px 0 0 0', color: 'var(--black)' }}>
                    ${formatCOP(results.reduce((acc, r) => acc + r.admin, 0))}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {tab === 'registros' && role === 'admin' && (
        <div style={{ margin: '24px 0', padding: 16, border: '1px solid #aaa', borderRadius: 8, background: '#fff' }}>
          <h3>Listado de registros</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              style={{ background: '#ff4d4f', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
              onClick={async () => {
                if (window.confirm('¿Estás seguro de que deseas borrar TODOS los registros? Esta acción no se puede deshacer.')) {
                  const { error } = await supabase.from('barber_services').delete().neq('id', 0);
                  if (error) {
                    alert('Error al borrar los registros: ' + error.message);
                  } else {
                    setResults([]);
                    alert('¡Todos los registros han sido borrados!');
                  }
                }
              }}
            >
              Borrar todos los registros
            </button>
            <button
              style={{ background: '#007bff', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => {
                let sep = ';';
                let csv = '';
                let total = 0;
                // Barberos
                BARBERS.forEach(barber => {
                  const valor = results.filter(r => r.barberName === barber).reduce((acc, r) => acc + r.barber, 0);
                  csv += `${barber.toUpperCase()}${sep}${valor}\n`;
                  total += valor;
                });
                // Productos Barbería
                const productosTotal = sales.reduce((acc, s) => acc + s.quantity * s.sellPrice, 0);
                csv += `PRODUCTOS BARBERIA${sep}${productosTotal}\n`;
                total += productosTotal;
                // Administrador
                const adminTotal = results.reduce((acc, r) => acc + r.admin, 0);
                csv += `ADMINISTRADOR${sep}${adminTotal}\n`;
                total += adminTotal;
                // Total general
                csv += `TOTAL${sep}${total}\n`;
                // Fecha de exportación
                csv += `\nFecha de exportación${sep}${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n`;
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `resumen_ganancias_invictus_${new Date().toISOString().slice(0,10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            >
              Exportar a CSV
            </button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>
              Filtrar por barbero:
              <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)} style={{ marginLeft: 8 }}>
                <option value="">Todos</option>
                {BARBERS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          </div>
          <ul style={{ maxHeight: 250, overflowY: 'auto', paddingLeft: 20 }}>
            {results
              .filter(r => !filterBarber || r.barberName === filterBarber)
              .map((r, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  <strong>{r.barberName}</strong> | Valor: ${formatCOP(r.total)} | Propina: ${formatCOP(r.tip)}<br/>
                  <span style={{ fontSize: 12, color: '#555' }}>
                    {r.timestamp instanceof Date ? r.timestamp.toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : ''}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
      {tab === 'inventory' && (
        <Inventory
          products={products}
          onAdd={handleAddProduct}
          onRemove={handleRemoveProduct}
          isAdmin={role === 'admin'}
          productList={productList}
          onEditProductSellPrice={handleEditProductSellPrice}
          onAddProductToList={handleAddProductToList}
        />
      )}
      {tab === 'venta' && (
        <SellProduct products={products} setProducts={setProducts} sales={sales} setSales={setSales} isAdmin={role === 'admin'} />
      )}
      {tab === 'historial' && <History />}
    </div>
  );
};

export default App; 