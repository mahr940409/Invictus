import React, { useState } from 'react';
import { Result } from '../types';

interface Props {
  onCalculate: (result: Result) => void;
}

const paymentMethods = ['Efectivo', 'Transferencia'];

const BarberForm: React.FC<Props> = ({ onCalculate }) => {
  const [barber, setBarber] = useState('');
  const [serviceValue, setServiceValue] = useState('');
  const [tip, setTip] = useState('');
  const [payment, setPayment] = useState('');
  const [notes, setNotes] = useState('');

  // Obtener la lista de barberos del localStorage
  const barbers = JSON.parse(localStorage.getItem('barbers') || '[]');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceValueNum = parseFloat(serviceValue);
    const tipNum = parseFloat(tip) || 0;
    
    if (!barber || isNaN(serviceValueNum) || serviceValueNum <= 0 || !payment) return;
    
    const total = serviceValueNum + tipNum;
    const admin = serviceValueNum * 0.5;
    const barberValue = serviceValueNum * 0.5 + tipNum;

    onCalculate({ 
      barber: barberValue, 
      admin, 
      tip: tipNum, 
      total, 
      barberName: barber, 
      payment_method: payment,
      timestamp: new Date()
    });

    setBarber('');
    setServiceValue('');
    setTip('');
    setPayment('');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 500, width: '100%', margin: '0 auto', background: 'var(--white)', boxSizing: 'border-box' }}>
      <h2 style={{ color: 'var(--black)', textAlign: 'center', marginBottom: 24 }}>Registrar Servicio</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Barbero</span>
          <select value={barber} onChange={e => setBarber(e.target.value)} required className="select" style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="">Seleccione...</option>
            {barbers.map((b: string) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: 'var(--light-gray)', borderRadius: 8 }}>
          <h3 style={{ color: 'var(--black)', margin: 0 }}>Servicio</h3>
          <label style={{ width: '100%' }}>
            <span style={{ color: 'var(--black)', fontWeight: 600 }}>Valor del servicio</span>
            <input 
              type="number" 
              value={serviceValue} 
              onChange={e => setServiceValue(e.target.value)} 
              min="0" 
              step="0.01" 
              required 
              className="input" 
              style={{ width: '100%', boxSizing: 'border-box' }} 
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: 'var(--light-gray)', borderRadius: 8 }}>
          <h3 style={{ color: 'var(--black)', margin: 0 }}>Propina</h3>
          <label style={{ width: '100%' }}>
            <span style={{ color: 'var(--black)', fontWeight: 600 }}>Valor de la propina</span>
            <input 
              type="number" 
              value={tip} 
              onChange={e => setTip(e.target.value)} 
              min="0" 
              step="0.01" 
              className="input" 
              style={{ width: '100%', boxSizing: 'border-box' }} 
              placeholder="Opcional"
            />
          </label>
        </div>

        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Medio de pago</span>
          <select value={payment} onChange={e => setPayment(e.target.value)} required className="select" style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="">Seleccione...</option>
            {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Observaciones</span>
          <input 
            type="text" 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            className="input" 
            style={{ width: '100%', boxSizing: 'border-box' }} 
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'var(--black)', color: 'var(--gold)', borderRadius: 8 }}>
          <span style={{ fontWeight: 600 }}>Total:</span>
          <span style={{ fontWeight: 600 }}>
            ${((parseFloat(serviceValue) || 0) + (parseFloat(tip) || 0)).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <button type="submit" className="btn" style={{ marginTop: 12, width: '100%', background: 'var(--gold)', color: 'var(--black)' }}>
          Registrar Servicio
        </button>
      </div>
    </form>
  );
};

export default BarberForm; 