import React, { useState } from 'react';
import { Result } from '../App';

interface Props {
  onCalculate: (result: Result) => void;
}

const barbers = ['Barbero 1', 'Barbero 2', 'Barbero 3', 'Barbero 4'];
const paymentMethods = ['Efectivo', 'Transferencia'];

const BarberForm: React.FC<Props> = ({ onCalculate }) => {
  const [barber, setBarber] = useState('');
  const [total, setTotal] = useState('');
  const [payment, setPayment] = useState('');
  const [notes, setNotes] = useState('');
  const [hasTip, setHasTip] = useState('');
  const [tip, setTip] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseFloat(total);
    const tipNum = hasTip === 'si' ? parseFloat(tip) || 0 : 0;
    if (!barber || isNaN(totalNum) || totalNum <= 0 || !payment || !hasTip || (hasTip === 'si' && (tip === '' || isNaN(parseFloat(tip))))) return;
    let barberValue = 0, admin = 0;
    admin = totalNum * 0.5;
    if (tipNum > 0) {
      barberValue = totalNum * 0.5 + tipNum;
    } else {
      barberValue = totalNum * 0.5;
    }
    onCalculate({ barber: barberValue, admin, tip: tipNum, total: totalNum, barberName: barber, payment_method: payment });
    setBarber('');
    setTotal('');
    setPayment('');
    setNotes('');
    setHasTip('');
    setTip('');
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 500, width: '100%', margin: '0 auto', background: 'var(--white)', boxSizing: 'border-box' }}>
      <h2 style={{ color: 'var(--black)', textAlign: 'center', marginBottom: 24 }}>Registrar Servicio</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Barbero</span>
          <select value={barber} onChange={e => setBarber(e.target.value)} required className="select" style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="">Seleccione...</option>
            {barbers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Valor</span>
          <input type="number" value={total} onChange={e => setTotal(e.target.value)} min="0" step="0.01" required className="input" style={{ width: '100%', boxSizing: 'border-box' }} />
        </label>
        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Medio de pago</span>
          <select value={payment} onChange={e => setPayment(e.target.value)} required className="select" style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="">Seleccione...</option>
            {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Observaciones</span>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" style={{ width: '100%', boxSizing: 'border-box' }} />
        </label>
        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Propina</span>
          <select value={hasTip} onChange={e => setHasTip(e.target.value)} required className="select" style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="">Seleccione...</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </label>
        <label style={{ width: '100%' }}>
          <span style={{ color: 'var(--black)', fontWeight: 600 }}>Valor propina</span>
          <input type="number" value={tip} onChange={e => setTip(e.target.value)} min="0" step="0.01" disabled={hasTip !== 'si'} required={hasTip === 'si'} className="input" style={{ width: '100%', boxSizing: 'border-box' }} />
        </label>
        <button type="submit" className="btn" style={{ marginTop: 12, width: '100%' }}>Agregar</button>
      </div>
    </form>
  );
};

export default BarberForm; 