import React from 'react';
import { Result } from '../types';

interface Props {
  results: Result[];
  role: 'admin' | 'aux' | 'barber';
}

const Summary: React.FC<Props> = ({ results, role }) => {
  if (role !== 'admin') return null;

  const totalBarber = results.reduce((acc, r) => acc + r.barber, 0);
  const totalAdmin = results.reduce((acc, r) => acc + r.admin, 0);
  const totalTips = results.reduce((acc, r) => acc + (r.tip || 0), 0);

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ background: 'var(--white)', padding: '1.5rem 1.2rem', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', minWidth: 200 }}>
        <h3 style={{ marginBottom: 16, textAlign: 'center' }}>Ganancias Barberos</h3>
        <div style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}>
          ${totalBarber.toLocaleString('es-CO')}
        </div>
      </div>
      <div style={{ background: 'var(--white)', padding: '1.5rem 1.2rem', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', minWidth: 200 }}>
        <h3 style={{ marginBottom: 16, textAlign: 'center' }}>Ganancias Admin</h3>
        <div style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}>
          ${totalAdmin.toLocaleString('es-CO')}
        </div>
      </div>
      <div style={{ background: 'var(--white)', padding: '1.5rem 1.2rem', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', minWidth: 200 }}>
        <h3 style={{ marginBottom: 16, textAlign: 'center' }}>Total Propinas</h3>
        <div style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}>
          ${totalTips.toLocaleString('es-CO')}
        </div>
      </div>
    </div>
  );
};

export default Summary; 