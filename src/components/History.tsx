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

interface HistoryProps {
  onDataDeleted?: () => void;
}

const History: React.FC<HistoryProps> = ({ onDataDeleted }) => {
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

  const handleStartNewWeek = async () => {
    if (!window.confirm('¿Está seguro que desea iniciar una nueva semana? Esto guardará un resumen de la semana actual y limpiará todos los registros para empezar de cero. Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      console.log('Iniciando nueva semana...');

      // Primero, obtener los datos actuales para crear el resumen
      console.log('Obteniendo datos de la semana actual...');
      
      // Obtener servicios de barbería
      const { data: barberServices } = await supabase
        .from('barber_services')
        .select('*');

      // Obtener ventas
      const { data: salesData } = await supabase
        .from('sales')
        .select('*');

      // Calcular resumen de la semana
      const barberEarnings: { [key: string]: number } = {};
      let adminEarnings = 0;
      let productSalesTotal = 0;

      // Calcular ganancias de barberos
      if (barberServices) {
        barberServices.forEach(service => {
          const barberName = service.barber_name;
          if (!barberEarnings[barberName]) {
            barberEarnings[barberName] = 0;
          }
          barberEarnings[barberName] += service.barber_amount;
          adminEarnings += service.admin_amount;
        });
      }

      // Calcular total de ventas de productos
      if (salesData) {
        productSalesTotal = salesData.reduce((total, sale) => total + sale.total, 0);
      }

      const totalEarnings = adminEarnings + productSalesTotal + Object.values(barberEarnings).reduce((sum, earning) => sum + earning, 0);

      // Calcular fechas de la semana (lunes a domingo)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = domingo
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      // Guardar resumen de la semana
      console.log('Guardando resumen de la semana...');
      const { error: summaryError } = await supabase
        .from('weekly_summaries')
        .insert([{
          week_start_date: monday.toISOString().split('T')[0],
          week_end_date: sunday.toISOString().split('T')[0],
          barber_earnings: barberEarnings,
          product_sales_total: productSalesTotal,
          admin_earnings: adminEarnings,
          total_earnings: totalEarnings
        }]);

      if (summaryError) {
        console.error('Error guardando resumen:', summaryError);
        throw summaryError;
      }

      console.log('Resumen de la semana guardado exitosamente');

      // Ahora eliminar los datos de la semana actual
      console.log('Eliminando ventas de la semana actual...');
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .gte('id', 0);

      if (salesError) {
        console.error('Error eliminando ventas:', salesError);
        throw salesError;
      }

      console.log('Eliminando productos del inventario actual...');
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .gte('id', 0);

      if (productsError) {
        console.error('Error eliminando productos:', productsError);
        throw productsError;
      }

      console.log('Eliminando servicios de barbería de la semana actual...');
      const { error: servicesError } = await supabase
        .from('barber_services')
        .delete()
        .gte('id', 0);

      if (servicesError) {
        console.error('Error eliminando servicios:', servicesError);
        throw servicesError;
      }

      console.log('Nueva semana iniciada exitosamente');

      // Limpiar el estado local inmediatamente
      setInventoryLogs([]);
      setSales([]);
      
      alert('¡Nueva semana iniciada exitosamente! El resumen de la semana anterior ha sido guardado y todos los registros han sido limpiados.');
      
      // Notificar al componente padre
      if (onDataDeleted) {
        onDataDeleted();
      }
      
      // Recargar la página para asegurar que todos los estados se actualicen
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error iniciando nueva semana:', error);
      alert('Error al iniciar la nueva semana. Por favor, intente nuevamente.');
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
          onClick={handleStartNewWeek}
        >
          <FaTrash /> Iniciar Nueva Semana
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