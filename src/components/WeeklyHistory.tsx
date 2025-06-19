import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FaDownload } from 'react-icons/fa';

interface WeeklySummary {
  id: number;
  week_start_date: string;
  week_end_date: string;
  barber_earnings: { [key: string]: number };
  product_sales_total: number;
  admin_earnings: number;
  total_earnings: number;
  created_at: string;
}

const WeeklyHistory: React.FC = () => {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeklySummaries();
  }, []);

  const loadWeeklySummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('*')
        .order('week_start_date', { ascending: false });

      if (error) {
        console.error('Error cargando resúmenes semanales:', error);
        return;
      }

      setSummaries(data || []);
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadWeeklyCSV = () => {
    const sep = ';';
    let csvContent = 'Semana,Barberos,Ganancia Productos,Ganancia Admin,Total\n';
    
    summaries.forEach(summary => {
      const weekRange = `${summary.week_start_date} - ${summary.week_end_date}`;
      const barberTotal = Object.values(summary.barber_earnings).reduce((sum, earning) => sum + earning, 0);
      csvContent += `${weekRange}${sep}${barberTotal}${sep}${summary.product_sales_total}${sep}${summary.admin_earnings}${sep}${summary.total_earnings}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `resumen_semanas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando historial semanal...</div>;
  }

  return (
    <div className="historial-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: 'var(--black)' }}>Historial de Resúmenes Semanales</h2>
        <button
          className="btn-gold"
          onClick={downloadWeeklyCSV}
          disabled={summaries.length === 0}
        >
          <FaDownload /> Descargar CSV
        </button>
      </div>

      {summaries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          No hay resúmenes semanales disponibles.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Barberos</th>
                <th>Productos</th>
                <th>Admin</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => {
                const barberTotal = Object.values(summary.barber_earnings).reduce((sum, earning) => sum + earning, 0);
                return (
                  <tr key={summary.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {new Date(summary.week_start_date).toLocaleDateString('es-CO')} - {new Date(summary.week_end_date).toLocaleDateString('es-CO')}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {Object.entries(summary.barber_earnings).map(([barber, earning]) => (
                          <div key={barber}>{barber}: ${earning.toLocaleString('es-CO')}</div>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--gold)' }}>
                      ${barberTotal.toLocaleString('es-CO')}
                    </td>
                    <td style={{ fontWeight: 600, color: '#27ae60' }}>
                      ${summary.product_sales_total.toLocaleString('es-CO')}
                    </td>
                    <td style={{ fontWeight: 600, color: '#e74c3c' }}>
                      ${summary.admin_earnings.toLocaleString('es-CO')}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--black)', fontSize: '1.1rem' }}>
                      ${summary.total_earnings.toLocaleString('es-CO')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WeeklyHistory; 