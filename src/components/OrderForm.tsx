import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Product {
  name: string;
  sellPrice: number;
  quantity: number;
}

interface Order {
  id?: number;
  client_name: string;
  products: Product[];
  beard_service: boolean;
  beard_service_value: number;
  tip: number;
  total: number;
  is_paid: boolean;
  created_at: Date;
}

interface OrderFormProps {
  productList: { name: string; sellPrice: number }[];
  isAdmin?: boolean;
  isAux?: boolean;
}

const OrderForm: React.FC<OrderFormProps> = ({ productList, isAdmin, isAux }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clientName, setClientName] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [beardService, setBeardService] = useState(false);
  const [beardServiceValue, setBeardServiceValue] = useState('');
  const [tip, setTip] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!clientName.trim()) {
      setEditingOrderId(null);
      setSelectedProducts([]);
      setBeardService(false);
      setBeardServiceValue('');
      setTip('');
      return;
    }
    const existingOrder = orders.find(o => o.client_name.toLowerCase() === clientName.trim().toLowerCase() && !o.is_paid);
    if (existingOrder) {
      setEditingOrderId(existingOrder.id!);
      setSelectedProducts(existingOrder.products);
      setBeardService(existingOrder.beard_service);
      setBeardServiceValue(existingOrder.beard_service_value ? String(existingOrder.beard_service_value) : '');
      setTip(existingOrder.tip ? String(existingOrder.tip) : '');
    } else {
      setEditingOrderId(null);
      setSelectedProducts([]);
      setBeardService(false);
      setBeardServiceValue('');
      setTip('');
    }
  }, [clientName, orders]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('is_paid', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        setError('Error al cargar los pedidos: ' + error.message);
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.error('Unexpected error fetching orders:', err);
      setError('Error inesperado al cargar los pedidos');
    }
  };

  const addProduct = () => {
    setSelectedProducts([...selectedProducts, { name: '', sellPrice: 0, quantity: 1 }]);
  };

  const removeProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const newProducts = [...selectedProducts];
    if (field === 'name') {
      const product = productList.find(p => p.name === value);
      if (product) {
        newProducts[index] = {
          ...newProducts[index],
          name: product.name,
          sellPrice: product.sellPrice
        };
      }
    } else {
      newProducts[index] = {
        ...newProducts[index],
        [field]: value
      };
    }
    setSelectedProducts(newProducts);
  };

  const calculateTotal = () => {
    const productsTotal = selectedProducts.reduce((sum, product) => 
      sum + (product.sellPrice * product.quantity), 0);
    const serviceTotal = beardService ? (parseFloat(beardServiceValue) || 0) : 0;
    const tipTotal = parseFloat(tip) || 0;
    return productsTotal + serviceTotal + tipTotal;
  };

  const handleEditOrder = (order: Order) => {
    setClientName(order.client_name);
    setEditingOrderId(order.id!);
    setSelectedProducts(order.products);
    setBeardService(order.beard_service);
    setBeardServiceValue(order.beard_service_value ? String(order.beard_service_value) : '');
    setTip(order.tip ? String(order.tip) : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (!clientName.trim()) {
        setError('Por favor ingrese el nombre del cliente');
        return;
      }
      if (selectedProducts.length === 0 && !beardService) {
        setError('Por favor agregue al menos un producto o un servicio de barbería');
        return;
      }
      if (beardService && (!beardServiceValue || parseFloat(beardServiceValue) <= 0)) {
        setError('Por favor ingrese el valor del servicio de barbería');
        return;
      }
      const newOrder = {
        client_name: clientName.trim(),
        products: selectedProducts,
        beard_service: beardService,
        beard_service_value: beardService ? parseFloat(beardServiceValue) : 0,
        tip: parseFloat(tip) || 0,
        total: calculateTotal(),
        is_paid: false,
        created_at: new Date().toISOString()
      };
      if (editingOrderId) {
        const { error } = await supabase
          .from('orders')
          .update(newOrder)
          .eq('id', editingOrderId);
        if (error) {
          setError('Error al actualizar el pedido: ' + error.message);
          return;
        }
        setSuccess('Pedido actualizado exitosamente');
      } else {
        const { data, error } = await supabase
          .from('orders')
          .insert([newOrder])
          .select();
        if (error) {
          setError('Error al crear el pedido: ' + error.message);
          return;
        }
        setSuccess('Pedido creado exitosamente');
      }
      setClientName('');
      setSelectedProducts([]);
      setBeardService(false);
      setBeardServiceValue('');
      setTip('');
      setEditingOrderId(null);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error inesperado al crear/actualizar el pedido');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsPaid = async (orderId: number) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ is_paid: true })
        .eq('id', orderId);

      if (error) {
        console.error('Error marking order as paid:', error);
        setError('Error al marcar el pedido como pagado: ' + error.message);
        return;
      }

      fetchOrders();
    } catch (err) {
      console.error('Unexpected error marking order as paid:', err);
      setError('Error inesperado al marcar el pedido como pagado');
    }
  };

  return (
    <div className="card" style={{ maxWidth: 800, width: '100%', margin: '2rem auto', background: 'var(--white)', padding: '24px' }}>
      <h2 style={{ color: 'var(--black)', textAlign: 'center', marginBottom: 24 }}>Nuevo Pedido</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <input
            type="text"
            placeholder="Nombre del cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="input"
            required
            disabled={isLoading}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: 'var(--light-gray)', borderRadius: 8 }}>
          <h3 style={{ color: 'var(--black)', margin: 0 }}>Servicio de Barbería</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="beardService"
              checked={beardService}
              onChange={(e) => setBeardService(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="beardService">Incluir servicio de barbería</label>
          </div>
          {beardService && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ width: '100%' }}>
                <span style={{ color: 'var(--black)', fontWeight: 600 }}>Valor del servicio</span>
                <input
                  type="number"
                  value={beardServiceValue}
                  onChange={(e) => setBeardServiceValue(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  disabled={isLoading}
                />
              </label>
              <label style={{ width: '100%' }}>
                <span style={{ color: 'var(--black)', fontWeight: 600 }}>Propina</span>
                <input
                  type="number"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  min="0"
                  step="0.01"
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Opcional"
                  disabled={isLoading}
                />
              </label>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: 'var(--light-gray)', borderRadius: 8 }}>
          <h3 style={{ color: 'var(--black)', margin: 0 }}>Productos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedProducts.map((product, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={product.name}
                  onChange={(e) => updateProduct(index, 'name', e.target.value)}
                  className="select"
                  required
                  style={{ flex: 2 }}
                  disabled={isLoading}
                >
                  <option value="">Seleccione un producto</option>
                  {productList.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} - ${p.sellPrice.toLocaleString('es-CO')}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={product.quantity}
                  onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value))}
                  min="1"
                  className="input"
                  style={{ width: 80 }}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="btn btn-danger"
                  style={{ padding: '8px 12px' }}
                  disabled={isLoading}
                >
                  X
                </button>
              </div>
            ))}
          </div>
          <button 
            type="button" 
            onClick={addProduct} 
            className="btn" 
            style={{ alignSelf: 'flex-start' }}
            disabled={isLoading}
          >
            Agregar Producto
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'var(--black)', color: 'var(--gold)', borderRadius: 8 }}>
          <span style={{ fontWeight: 600 }}>Total:</span>
          <span style={{ fontWeight: 600 }}>
            ${calculateTotal().toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <button 
          type="submit" 
          className="btn" 
          style={{ background: 'var(--gold)', color: 'var(--black)' }}
          disabled={isLoading}
        >
          {isLoading ? (editingOrderId ? 'Actualizando...' : 'Creando pedido...') : (editingOrderId ? 'Actualizar Pedido' : 'Crear Pedido')}
        </button>
      </form>

      {error && (
        <div style={{ 
          color: 'white', 
          backgroundColor: '#e74c3c', 
          padding: '12px', 
          borderRadius: '8px', 
          marginTop: '16px' 
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ 
          color: 'white', 
          backgroundColor: '#27ae60', 
          padding: '12px', 
          borderRadius: '8px', 
          marginTop: '16px' 
        }}>
          {success}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h3 style={{ color: 'var(--black)', marginBottom: 16 }}>Pedidos Pendientes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              background: 'var(--light-gray)',
              borderRadius: '8px',
              color: 'var(--black)',
              fontSize: '16px'
            }}>
              No hay pedidos pendientes en este momento
            </div>
          ) : (
            orders.map((order) => (
              <div 
                key={order.id} 
                className="card" 
                style={{ 
                  background: 'var(--light-gray)', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: editingOrderId === order.id ? '2px solid var(--gold)' : '1px solid #ddd',
                }} 
                onClick={() => handleEditOrder(order)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, color: editingOrderId === order.id ? 'var(--gold)' : 'inherit' }}>
                      {order.client_name}
                      {editingOrderId === order.id && (
                        <span style={{ 
                          fontSize: '12px', 
                          marginLeft: '8px', 
                          padding: '2px 6px', 
                          background: 'var(--gold)', 
                          color: 'var(--black)', 
                          borderRadius: '4px' 
                        }}>
                          Editando
                        </span>
                      )}
                    </h4>
                    {order.beard_service && (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ margin: '4px 0' }}>
                          Servicio de barbería: ${order.beard_service_value.toLocaleString('es-CO')}
                        </p>
                        {order.tip > 0 && (
                          <p style={{ margin: '4px 0' }}>
                            Propina: ${order.tip.toLocaleString('es-CO')}
                          </p>
                        )}
                      </div>
                    )}
                    {order.products.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ margin: '4px 0', fontWeight: 600 }}>Productos:</p>
                        {order.products.map((product, index) => (
                          <p key={index} style={{ margin: '4px 0' }}>
                            {product.name} x{product.quantity} - ${(product.sellPrice * product.quantity).toLocaleString('es-CO')}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: 8 }}>
                      ${order.total.toLocaleString('es-CO')}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        order.id && markAsPaid(order.id);
                      }}
                      className="btn"
                      style={{ background: 'var(--gold)', color: 'var(--black)' }}
                    >
                      Marcar como Pagado
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderForm; 