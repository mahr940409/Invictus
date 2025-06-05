import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FaTrash, FaDownload } from 'react-icons/fa';

interface InventoryLog {
  id: number;
  action_type: string;
  product_name: string;
  quantity: number;
  user_name: string;
  details: string;
  created_at: string;
}

interface Sale {
  id: number;
  product_name: string;
  quantity: number;
  total: number;
  payment_method: string;
  user_name: string;
  created_at: string;
}

const History: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales'>('inventory');
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadInventoryLogs();
    loadSales();
  }, []);

  const loadInventoryLogs = async () => {
    const { data, error } = await supabase
      .from('inventory_log')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error cargando logs:', error);
      return;
    }
    
    setInventoryLogs(data || []);
  };

  const loadSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, product_id (name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error cargando ventas:', error);
      return;
    }
    
    const formattedSales = data?.map(sale => ({
      id: sale.id,
      product_name: sale.product_id?.name || '',
      quantity: sale.quantity,
      total: sale.total,
      payment_method: sale.payment_method,
      user_name: sale.user_name,
      created_at: sale.created_at
    })) || [];
    
    setSales(formattedSales);
  };

  const filterByDate = (data: any[]) => {
    if (!startDate && !endDate) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item.created_at);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      return itemDate >= start && itemDate <= end;
    });
  };

  const downloadCSV = (data: any[], type: 'inventory' | 'sales') => {
    const sep = ';';
    const headers = type === 'inventory'
      ? ['Fecha', 'Acción', 'Producto', 'Cantidad', 'Usuario', 'Detalles']
      : ['Fecha', 'Producto', 'Cantidad', 'Total', 'Método de Pago', 'Usuario'];
    const rows = data.map(item => {
      if (type === 'inventory') {
        return [
          new Date(item.created_at).toLocaleString(),
          item.action_type,
          item.product_name,
          item.quantity,
          item.user_name,
          item.details
        ];
      } else {
        return [
          new Date(item.created_at).toLocaleString(),
          item.product_name,
          item.quantity,
          item.total,
          item.payment_method,
          item.user_name
        ];
      }
    });
    let csvContent = '';
    csvContent += headers.join(sep) + '\n';
    rows.forEach(row => {
      csvContent += row.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(sep) + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type === 'inventory' ? 'historial_inventario' : 'historial_ventas'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm('¿Está seguro que desea eliminar todos los datos? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Eliminar ventas primero debido a las restricciones de clave foránea
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .neq('id', 0); // Eliminar todos los registros

      if (salesError) throw salesError;

      // Eliminar productos
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .neq('id', 0);

      if (productsError) throw productsError;

      // Eliminar logs de inventario
      const { error: logsError } = await supabase
        .from('inventory_log')
        .delete()
        .neq('id', 0);

      if (logsError) throw logsError;

      // Eliminar servicios de barbería
      const { error: servicesError } = await supabase
        .from('barber_services')
        .delete()
        .neq('id', 0);

      if (servicesError) throw servicesError;

      // Recargar los datos
      loadInventoryLogs();
      loadSales();
      
      alert('Todos los datos han sido eliminados exitosamente.');
    } catch (error) {
      console.error('Error eliminando datos:', error);
      alert('Error al eliminar los datos. Por favor, intente nuevamente.');
    }
  };

  const filteredInventoryLogs = filterByDate(inventoryLogs);
  const filteredSales = filterByDate(sales);

  return (
    <div className="historial-card">
      <ul className="historial-tabs">
        <li>
          <button
            className={`historial-tab${activeTab === 'inventory' ? ' active' : ''}`}
            onClick={() => setActiveTab('inventory')}
            tabIndex={0}
          >
            Acciones de Inventario
          </button>
        </li>
        <li>
          <button
            className={`historial-tab${activeTab === 'sales' ? ' active' : ''}`}
            onClick={() => setActiveTab('sales')}
            tabIndex={0}
          >
            Ventas
          </button>
        </li>
      </ul>
      <div className="historial-actions">
        <div>
          <label>Fecha Inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label>Fecha Fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button
          className="btn-gold"
          onClick={() => downloadCSV(
            activeTab === 'inventory' ? filteredInventoryLogs : filteredSales,
            activeTab
          )}
        >
          <FaDownload /> Descargar CSV
        </button>
        <button
          className="btn-danger"
          onClick={handleDeleteAllData}
        >
          <FaTrash /> Eliminar Todos los Datos
        </button>
      </div>
      <div className="table-responsive">
        {activeTab === 'inventory' ? (
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventoryLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.action_type}</td>
                  <td>{log.product_name}</td>
                  <td>{log.quantity}</td>
                  <td>{log.user_name}</td>
                  <td>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Total</th>
                <th>Método de Pago</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.created_at).toLocaleString()}</td>
                  <td>{sale.product_name}</td>
                  <td>{sale.quantity}</td>
                  <td>{sale.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
                  <td>{sale.payment_method}</td>
                  <td>{sale.user_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default History; 