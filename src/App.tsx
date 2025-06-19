import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import BarberForm from './components/BarberForm';
import Inventory from './components/Inventory';
import SellProduct from './components/SellProduct';
import History from './components/History';
import WeeklyHistory from './components/WeeklyHistory';
import OrderForm from './components/OrderForm';
import Summary from './components/Summary';
import type { Result, AppSale, ProductLot } from './types';
import type { BarberService, Product, Sale } from './lib/supabase';
import jsPDF from 'jspdf';

const USERS = [
  { user: 'luis.paez', pass: '1234', role: 'admin', name: 'Luis Paez' },
  { user: 'nataly.gomez', pass: '1002158638', role: 'aux', name: 'Nataly Gómez' },
  { user: 'jose.torres', pass: '1044215117', role: 'barber', name: 'Jose Torres' },
  { user: 'breiner.ferrer', pass: '1002185092', role: 'barber', name: 'Breiner Ferrer' },
  { user: 'edinson.vergara', pass: '1001914098', role: 'barber', name: 'Edinson Vergara' },
  { user: 'deivi.rivera', pass: '1129506575', role: 'barber', name: 'Deivi Rivera' },
];

const BARBERS = USERS
  .filter(u => u.role === 'barber')
  .map(u => u.name);

const TABS = [
  { key: 'main', label: 'Formulario y Ganancias', roles: ['admin', 'aux'] },
  { key: 'registros', label: 'Listado de registros', roles: ['admin'] },
  { key: 'inventory', label: 'Inventario', roles: ['admin', 'aux'] },
  { key: 'venta', label: 'Vender producto', roles: ['admin', 'aux'] },
  { key: 'pedidos', label: 'Pedidos', roles: ['admin', 'aux'] },
  { key: 'historial', label: 'Historial', roles: ['admin'] },
  { key: 'historial_semanal', label: 'Historial Semanal', roles: ['admin'] },
  { key: 'ganancias', label: 'Mis Ganancias', roles: ['barber'] },
];

type TabKey = 'main' | 'registros' | 'inventory' | 'venta' | 'pedidos' | 'historial' | 'historial_semanal' | 'ganancias';

const App: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'aux' | 'barber' | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentTab, setTab] = useState<TabKey>('main');
  const [mainTab, setMainTab] = useState<'formulario' | 'barberos'>('formulario');
  const [products, setProducts] = useState<ProductLot[]>([]);
  const [sales, setSales] = useState<AppSale[]>([]);
  const [productList, setProductList] = useState<{ name: string; sellPrice: number }[]>([]);
  const [filterBarber, setFilterBarber] = useState<string>('');

  useEffect(() => {
    loadServices();
    loadProducts();
    loadSales();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('barber_services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setResults(data.map(d => ({
        barber: d.barber_amount,
        admin: d.admin_amount,
        tip: d.tip_amount,
        total: d.total_amount,
        barberName: d.barber_name,
        payment_method: d.payment_method,
        timestamp: new Date(d.created_at)
      })));
    } catch (error) {
      console.error('Error cargando servicios:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        const lots = data.map((prod: Product) => ({
          name: prod.name,
          quantity: prod.stock,
          buyPrice: prod.buy_price,
          sellPrice: prod.sell_price,
          timestamp: new Date(prod.created_at)
        }));
        setProducts(lots);
        setProductList(data.map((prod: Product) => ({ 
          name: prod.name, 
          sellPrice: prod.sell_price 
        })));
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const loadSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, product_id (name, buy_price, sell_price)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
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
    } catch (error) {
      console.error('Error cargando ventas:', error);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = USERS.find(u => u.user === loginUser && u.pass === loginPass);
    if (found) {
      setUser(found.user);
      setRole(found.role as 'admin' | 'aux' | 'barber');
      setUserName(found.name);
      localStorage.setItem('barbers', JSON.stringify(BARBERS));
      setLoginError('');
      
      // Si es un barbero, automáticamente mostrar la pestaña de ganancias
      if (found.role === 'barber') {
        setTab('ganancias');
      }
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    setUserName('');
    localStorage.removeItem('barbers');
  };

  const handleCalculate = async (result: Result) => {
    try {
      const { data, error } = await supabase
        .from('barber_services')
        .insert([{
          barber_amount: result.barber,
          admin_amount: result.admin,
          tip_amount: result.tip,
          total_amount: result.total,
          barber_name: result.barberName || '',
          payment_method: result.payment_method || 'Efectivo',
          created_at: result.timestamp || new Date()
        }]);

      if (error) throw error;

      setResults(prev => [{
        barber: result.barber,
        admin: result.admin,
        tip: result.tip,
        total: result.total,
        barberName: result.barberName || '',
        payment_method: result.payment_method || 'Efectivo',
        timestamp: result.timestamp || new Date()
      }, ...prev]);

    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el servicio');
    }
  };

  const handleAddProduct = async (prod: Omit<ProductLot, 'timestamp'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: prod.name,
          stock: prod.quantity,
          buy_price: prod.buyPrice,
          sell_price: prod.sellPrice,
        }])
        .select();

      if (error) throw error;

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
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el producto');
    }
  };

  const handleRemoveProduct = async (index: number) => {
    try {
      const prod = products[index];
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('name', prod.name)
        .eq('stock', prod.quantity)
        .eq('buy_price', prod.buyPrice)
        .eq('sell_price', prod.sellPrice);

      if (error) throw error;

      setProducts(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el producto');
    }
  };

  const handleEditProductSellPrice = async (name: string, newSellPrice: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ sell_price: newSellPrice })
        .eq('name', name);

      if (error) throw error;

      setProductList(prev => prev.map(p => p.name === name ? { ...p, sellPrice: newSellPrice } : p));
      setProducts(prev => prev.map(l => l.name === name ? { ...l, sellPrice: newSellPrice } : l));
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el precio');
    }
  };

  const handleAddProductToList = (name: string, sellPrice: number) => {
    setProductList(prev => {
      if (!prev.find(p => p.name === name)) {
        return [...prev, { name, sellPrice }];
      }
      return prev;
    });
  };

  const handleDeleteAllRecords = async () => {
    if (window.confirm('¿Estás seguro de que deseas borrar TODOS los registros? Esta acción no se puede deshacer.')) {
      try {
        const { error } = await supabase
          .from('barber_services')
          .delete()
          .gte('id', 0);

        if (error) throw error;

        setResults([]);
        alert('¡Todos los registros han sido borrados!');
      } catch (error) {
        console.error('Error:', error);
        alert('Error al borrar los registros');
      }
    }
  };

  const handleDataDeleted = () => {
    // Recargar todos los datos después de borrar
    loadServices();
    loadProducts();
    loadSales();
  };

  const handleExportCSV = () => {
    let sep = ';';
    let csv = '';
    let total = 0;

    // Barberos
    BARBERS.forEach(barber => {
      const valor = results
        .filter(r => r.barberName === barber)
        .reduce((acc, r) => acc + r.barber, 0);
      csv += `${barber.toUpperCase()}${sep}${valor}\n`;
      total += valor;
    });

    // Productos Barbería
    const productosTotal = sales.reduce((acc, s) => acc + s.total, 0);
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

    // Crear y descargar el archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `resumen_ganancias_invictus_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      {!user ? (
        <div style={{
          maxWidth: 400,
          margin: '48px auto',
          padding: '32px 24px',
          background: 'var(--white)',
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          boxSizing: 'border-box',
        }}>
          <img src="/logo.png" alt="Logo Invictus" className="logo" style={{ marginBottom: 24 }} />
          <form onSubmit={handleLogin} style={{ width: '100%' }}>
            <div style={{ marginBottom: 18, width: '100%' }}>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--black)', fontWeight: 600 }}>
                Usuario
              </label>
              <input
                type="text"
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div style={{ marginBottom: 24, width: '100%' }}>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--black)', fontWeight: 600 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>
            {loginError && (
              <div style={{ color: '#e74c3c', marginBottom: 16, textAlign: 'center' }}>
                {loginError}
              </div>
            )}
            <button type="submit" className="btn" style={{ width: '100%', background: 'var(--gold)', color: 'var(--black)' }}>
              Iniciar sesión
            </button>
          </form>
        </div>
      ) : (
        <>
          <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--white)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 24 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 50, width: 'auto' }} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ color: 'var(--black)', fontWeight: 500 }}>
                Bienvenido, {userName}
              </span>
              <button onClick={handleLogout} className="btn" style={{ background: 'var(--black)', color: 'var(--gold)' }}>
                Cerrar sesión
              </button>
            </div>
          </header>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TABS.filter(t => t.roles.includes(role!)).map(tab => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key as TabKey)}
                className="btn"
                style={{
                  background: tab.key === currentTab ? 'var(--gold)' : 'var(--black)',
                  color: tab.key === currentTab ? 'var(--black)' : 'var(--gold)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 24px' }}>
            {currentTab === 'main' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                  <button
                    onClick={() => setMainTab('formulario')}
                    className="btn"
                    style={{
                      background: mainTab === 'formulario' ? 'var(--gold)' : 'var(--black)',
                      color: mainTab === 'formulario' ? 'var(--black)' : 'var(--gold)',
                    }}
                  >
                    Formulario
                  </button>
                  {role !== 'barber' && (
                    <button
                      onClick={() => setMainTab('barberos')}
                      className="btn"
                      style={{
                        background: mainTab === 'barberos' ? 'var(--gold)' : 'var(--black)',
                        color: mainTab === 'barberos' ? 'var(--black)' : 'var(--gold)',
                      }}
                    >
                      Barberos
                    </button>
                  )}
                </div>

                {mainTab === 'formulario' && <BarberForm onCalculate={handleCalculate} />}
                {mainTab === 'barberos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <Summary results={results} role={role!} />
                    <div className="barberos-grid" style={{
                      width: '100%',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: 32
                    }}>
                      {role === 'barber' ? (
                        (() => {
                          const barberResults = results.filter(r => r.barberName === userName);
                          return (
                            <div style={{
                              border: '1.5px solid #ccc',
                              borderRadius: 16,
                              padding: '32px 24px',
                              background: '#f9f9f9',
                              textAlign: 'center',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                              width: 350,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 16
                            }}>
                              <h3 style={{ margin: 0, fontSize: 22 }}>{userName}</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ background: '#f0f0f0', padding: 16, borderRadius: 8 }}>
                                  <div style={{ fontSize: 16, color: '#666' }}>Ganado hoy</div>
                                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--black)' }}>
                                    ${barberResults.reduce((acc, r) => acc + r.barber, 0).toLocaleString('es-CO')}
                                  </div>
                                </div>
                                <div style={{ background: '#f0f0f0', padding: 16, borderRadius: 8 }}>
                                  <div style={{ fontSize: 16, color: '#666' }}>Propinas</div>
                                  <div style={{ fontSize: 24, fontWeight: 700, color: '#27ae60' }}>
                                    ${barberResults.reduce((acc, r) => acc + (r.tip || 0), 0).toLocaleString('es-CO')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        BARBERS.map(barber => {
                          const barberResults = results.filter(r => r.barberName === barber);
                          return (
                            <div key={barber} style={{
                              border: '1.5px solid #ccc',
                              borderRadius: 16,
                              padding: '32px 24px',
                              background: '#f9f9f9',
                              textAlign: 'center',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                              width: 350,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 16
                            }}>
                              <h3 style={{ margin: 0, fontSize: 22 }}>{barber}</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ background: '#f0f0f0', padding: 16, borderRadius: 8 }}>
                                  <div style={{ fontSize: 16, color: '#666' }}>Ganado hoy</div>
                                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--black)' }}>
                                    ${barberResults.reduce((acc, r) => acc + r.barber, 0).toLocaleString('es-CO')}
                                  </div>
                                </div>
                                <div style={{ background: '#f0f0f0', padding: 16, borderRadius: 8 }}>
                                  <div style={{ fontSize: 16, color: '#666' }}>Propinas</div>
                                  <div style={{ fontSize: 24, fontWeight: 700, color: '#27ae60' }}>
                                    ${barberResults.reduce((acc, r) => acc + (r.tip || 0), 0).toLocaleString('es-CO')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {currentTab === 'inventory' && (
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
            {currentTab === 'venta' && (
              <SellProduct
                products={products}
                setProducts={setProducts}
                sales={sales}
                setSales={setSales}
                isAdmin={role === 'admin'}
              />
            )}
            {currentTab === 'pedidos' && (
              <OrderForm
                productList={productList}
                isAdmin={role === 'admin'}
                isAux={role === 'aux'}
              />
            )}
            {currentTab === 'historial' && <History onDataDeleted={handleDataDeleted} />}
            {currentTab === 'historial_semanal' && <WeeklyHistory />}
            {currentTab === 'ganancias' && role === 'barber' && (
              <div style={{ maxWidth: 500, margin: '0 auto', background: 'var(--white)', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.5rem 1.2rem' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Mis Ganancias</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {results
                    .filter(r => r.barberName === userName)
                    .map((r, i) => (
                      <div key={i} style={{ 
                        padding: 16, 
                        background: '#f8fafc', 
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--black)' }}>
                            ${r.barber.toLocaleString('es-CO')}
                          </div>
                          <div style={{ fontSize: 14, color: '#666' }}>
                            {r.timestamp?.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                          </div>
                        </div>
                        {r.tip > 0 && (
                          <div style={{ 
                            background: '#27ae60', 
                            color: 'white', 
                            padding: '4px 8px', 
                            borderRadius: 4,
                            fontSize: 14 
                          }}>
                            +${r.tip.toLocaleString('es-CO')} propina
                          </div>
                        )}
                      </div>
                    ))}
                </div>
                <div style={{ 
                  marginTop: 24, 
                  padding: 16, 
                  background: 'var(--gold)', 
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>Total Ganado</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    ${results
                      .filter(r => r.barberName === userName)
                      .reduce((acc, r) => acc + r.barber, 0)
                      .toLocaleString('es-CO')}
                  </div>
                </div>
              </div>
            )}
            {currentTab === 'registros' && role === 'admin' && (
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', background: 'var(--white)', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ margin: 0 }}>Listado de Registros</h2>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <button
                      onClick={handleExportCSV}
                      className="btn"
                      style={{ background: 'var(--gold)', color: 'var(--black)' }}
                    >
                      Exportar a CSV
                    </button>
                    <button
                      onClick={handleDeleteAllRecords}
                      className="btn"
                      style={{ background: '#e74c3c', color: 'white' }}
                    >
                      Borrar todos los registros
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: 'var(--black)', fontWeight: 500 }}>Filtrar por barbero:</span>
                    <select 
                      value={filterBarber} 
                      onChange={e => setFilterBarber(e.target.value)}
                      className="select"
                      style={{ minWidth: 200 }}
                    >
                      <option value="">Todos</option>
                      {BARBERS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxHeight: 'calc(100vh - 300px)',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {results
                    .filter(r => !filterBarber || r.barberName === filterBarber)
                    .map((r, i) => (
                      <div 
                        key={i}
                        style={{
                          padding: 16,
                          background: '#f8fafc',
                          borderRadius: 8,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--black)', marginBottom: 4 }}>
                            {r.barberName}
                          </div>
                          <div style={{ fontSize: 14, color: '#666' }}>
                            {r.timestamp?.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>Valor</div>
                            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--black)' }}>
                              ${r.total.toLocaleString('es-CO')}
                            </div>
                          </div>
                          {r.tip > 0 && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>Propina</div>
                              <div style={{ fontSize: 16, fontWeight: 500, color: '#27ae60' }}>
                                ${r.tip.toLocaleString('es-CO')}
                              </div>
                            </div>
                          )}
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>Método</div>
                            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--black)' }}>
                              {r.payment_method || 'Efectivo'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default App; 