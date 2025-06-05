import React from 'react';
import { Result } from '../App';

interface Props {
  result: Result;
  isAdmin?: boolean;
}

const Summary: React.FC<Props> = ({ result, isAdmin }) => (
  <div style={{ marginTop: 24, padding: 16, border: '1px solid #ccc', borderRadius: 8 }}>
    <h2>Resumen</h2>
    {isAdmin ? (
      <p><strong>Administrador recibe:</strong> ${result.admin.toFixed(2)}</p>
    ) : (
      <>
        <p><strong>Total:</strong> ${result.total.toFixed(2)}</p>
        <p><strong>Propina:</strong> ${result.tip.toFixed(2)}</p>
        <p><strong>Barbero recibe:</strong> ${result.barber.toFixed(2)}</p>
        <p><strong>Administrador recibe:</strong> ${result.admin.toFixed(2)}</p>
      </>
    )}
  </div>
);

export default Summary; 