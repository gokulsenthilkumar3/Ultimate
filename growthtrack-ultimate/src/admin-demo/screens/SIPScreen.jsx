import React, { useState } from 'react';
import { Panel, RecordsTable } from '../components';
import { money } from '../models/financeModel';

function project(amount, years, rate) {
  const months = years * 12, monthly = rate / 1200;
  return monthly ? amount * ((Math.pow(1 + monthly, months) - 1) / monthly) * (1 + monthly) : amount * months;
}
export default function SIPScreen({ view }) {
  const [amount, setAmount] = useState(10000), [years, setYears] = useState(10), [rate, setRate] = useState(10);
  const total = project(amount, years, rate), contributions = amount * years * 12;
  return <>
    <div className="two-columns"><Panel title="Plan a little, consistently" subtitle="Illustrative calculation; returns are an assumption."><div className="support-body">{[['Monthly contribution (₹)', amount, setAmount, 500, 100000, 500], ['Duration (years)', years, setYears, 1, 30, 1], ['Assumed annual return (%)', rate, setRate, 0, 20, .5]].map(([label, value, setter, min, max, step]) => <label className="range-field" key={label}>{label}<strong>{value.toLocaleString()}</strong><input type="range" aria-label={label} value={value} onChange={event => setter(Number(event.target.value))} min={min} max={max} step={step} /></label>)}</div></Panel>
      <Panel title="Your illustrative projection" subtitle="Monthly contributions at the beginning of each month"><div className="projection"><span className="muted">Estimated future value</span><strong>{money(total)}</strong><div className="definition-list"><div><dt>Total contributions</dt><dd>{money(contributions)}</dd></div><div><dt>Illustrative growth</dt><dd>{money(total - contributions)}</dd></div></div><p className="quiet-note">This calculator does not include fees, taxes, inflation, or guaranteed returns.</p></div></Panel></div>
    {view === 'projection' && <Panel title="Projection by year" subtitle="Calculated from the selected illustrative assumptions."><RecordsTable rows={Array.from({ length: years }, (_, i) => ({ year: i + 1, contributions: amount * (i + 1) * 12, total: project(amount, i + 1, rate) }))} columns={[{ key: 'year', label: 'Year' }, { key: 'contributions', label: 'Contributions', render: row => money(row.contributions) }, { key: 'total', label: 'Projected value', render: row => money(row.total) }]} label="SIP yearly projection" /></Panel>}
    {view === 'comparison' && <Panel title="Compare illustrative assumptions" subtitle="Examples around the selected rate; no return is guaranteed."><RecordsTable rows={[...new Set([Math.max(0, rate - 2), rate, Math.min(20, rate + 2)])].map(value => ({ rate: value, contributions, total: project(amount, years, value) }))} columns={[{ key: 'rate', label: 'Assumed annual return', render: row => `${row.rate}%` }, { key: 'contributions', label: 'Contributions', render: row => money(row.contributions) }, { key: 'total', label: 'Projected value', render: row => money(row.total) }]} label="SIP assumption comparison" /></Panel>}
  </>;
}
