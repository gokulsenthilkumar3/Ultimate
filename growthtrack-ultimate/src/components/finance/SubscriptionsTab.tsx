import React, { useMemo, useState } from 'react';
import { Calendar, Plus, Radar, Trash2, Settings } from 'lucide-react';
import Switch from '../ui/Switch';


export default function SubscriptionsTab({ fmtINR, currencySymbol, showAddSub, setShowAddSub, subForm, setSubForm, addSubscription, subs, handleDeleteSubscription, transactions, toast }) {
  const [autoAdd, setAutoAdd] = useState(false);

  const suggestions = useMemo(() => {
    const groups = new Map();
    (transactions || []).filter(transaction => transaction.type === 'Expense').forEach(transaction => {
      const key = String(transaction.note || transaction.category || '').trim().toLowerCase();
      if (!key) return;
      const rows = groups.get(key) || [];
      rows.push(transaction); groups.set(key, rows);
    });
    return [...groups.entries()].flatMap(([key, rows]) => {
      if (rows.length < 2 || subs.some(subscription => String(subscription.name).toLowerCase() === key)) return [];
      const amounts = rows.map(row => Number(row.amount) || 0);
      const average = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
      const stable = amounts.every(value => average > 0 && Math.abs(value - average) / average <= 0.2);
      return stable ? [{ name: rows[0].note || rows[0].category, cost: average, category: rows[0].category || 'Other', occurrences: rows.length }] : [];
    }).slice(0, 6);
  }, [subs, transactions]);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 className="card-title"><Calendar size={18}/> Recurring Subscriptions & Bills</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-2)' }}>
            <Settings size={14} /> Auto-add confident
            <Switch checked={autoAdd} onChange={(e) => setAutoAdd(e.target.checked)} />
          </label>
          <button className="btn-primary btn-sm" onClick={() => setShowAddSub(!showAddSub)}>
            {showAddSub ? 'Cancel' : <><Plus size={15}/> Add manually</>}
          </button>
        </div>
      </div>
      
      <section className="subscription-detection">
        <div>
          <Radar size={20}/>
          <span>
            <strong>Recurring-payment suggestions</strong>
            <small>Detected locally from similar expense descriptions and amounts. {autoAdd ? 'High-confidence items will be added automatically.' : 'Review before adding.'}</small>
          </span>
        </div>
        {suggestions.length ? (
          <div className="subscription-suggestions">
            {suggestions.map(suggestion => (
              <article key={suggestion.name}>
                <span>
                  <strong>{suggestion.name}</strong>
                  <small>{suggestion.occurrences} similar payments · about {fmtINR(suggestion.cost)}</small>
                </span>
                <button onClick={async () => { 
                  await addSubscription({ name: suggestion.name, cost: suggestion.cost, category: suggestion.category, next_date: '', auto_renew: 1 }); 
                  toast.success('Subscription added for review.'); 
                }}>Add</button>
              </article>
            ))}
          </div>
        ) : (
          <p>No strong recurring pattern detected yet. Import more statements or add a subscription manually.</p>
        )}
      </section>

      {showAddSub && (
        <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--accent)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Name</label><input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} className="form-input" placeholder="Netflix, Gym, etc." /></div>
          <div style={{ flex: '1 1 100px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Cost ({currencySymbol})</label><input type="number" value={subForm.cost} onChange={e => setSubForm({ ...subForm, cost: e.target.value })} className="form-input" placeholder="499" /></div>
          <div style={{ flex: '1 1 120px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Category</label><select value={subForm.category} onChange={e => setSubForm({ ...subForm, category: e.target.value })} className="form-input">{['OTT', 'Utilities', 'Fitness', 'Learning', 'Insurance', 'Rent', 'Credit'].map(c => <option key={c}>{c}</option>)}</select></div>
          <div style={{ flex: '1 1 140px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Next Bill Date</label><input type="date" value={subForm.next_date} onChange={e => setSubForm({ ...subForm, next_date: e.target.value })} className="form-input" /></div>
          <div style={{ flex: '1 1 60px' }}><label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Icon</label><input value={subForm.icon} onChange={e => setSubForm({ ...subForm, icon: e.target.value })} className="form-input" placeholder="🍿" /></div>
          <button className="btn-primary" onClick={async () => {
            if (!subForm.name || !subForm.cost) return toast.error('Name and cost are required');
            await addSubscription({ ...subForm, cost: parseFloat(subForm.cost) });
            setShowAddSub(false);
            setSubForm({ name: '', cost: '', category: 'OTT', next_date: '', icon: '🍿', auto_renew: 1 });
            toast.success('Subscription added');
          }}>Save subscription</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {subs.map(sub => (
          <div key={sub.id} style={{ padding: '1.5rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={22} aria-hidden="true" />
                <div><h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{sub.name}</h4><span className="label-caps" style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}>{sub.category}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--danger)', marginBottom: '4px' }}>{fmtINR(sub.cost)}</div>
                <button aria-label={`Delete ${sub.name}`} onClick={() => handleDeleteSubscription(sub.id)} className="btn-icon btn-icon--danger"><Trash2 size={15}/></button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Next Billing Date</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{sub.next_date || sub.nextDate || 'Not set'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
