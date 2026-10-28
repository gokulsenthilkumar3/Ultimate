import React from 'react';
import { LineChart, Panel, Progress, RecordsTable } from '../components';
import { SAMPLE_HOLDINGS as holdings, SAMPLE_PORTFOLIO_VALUE } from '../models/portfolioModel';
import { money as currency } from '../models/financeModel';

export default function PortfolioScreen({ view, openRecord }) {
  if (view === 'allocation') {
    const sectors = new Map();
    for (const row of holdings) sectors.set(row.sector, [...(sectors.get(row.sector) || []), row]);
    const total = holdings.reduce((sum, row) => sum + row.value, 0);
    return <Panel title="Portfolio allocation" subtitle="Sample holdings, grouped by sector."><div className="support-body">{[...sectors.entries()].map(([sector, rows]) => {
      const value = rows.reduce((sum, row) => sum + row.value, 0);
      return <div key={sector}><Progress label={`${sector} · ${currency(value)}`} value={Math.round(value / total * 100)} /></div>;
    })}<p className="muted">Total sample holdings: {currency(total)}</p></div></Panel>;
  }
  if (view === 'history') return <Panel title="Portfolio history" subtitle="Illustrative portfolio values over the selected sample month."><LineChart label="Sample portfolio value history" referenceValue={SAMPLE_PORTFOLIO_VALUE} /><RecordsTable rows={[
    { date: '28 Oct 2026', value: currency(SAMPLE_PORTFOLIO_VALUE), note: 'Current sample snapshot' },
    { date: '21 Oct 2026', value: currency(331980), note: 'Weekly sample snapshot' },
    { date: '14 Oct 2026', value: currency(328260), note: 'Weekly sample snapshot' },
  ]} columns={[{ key: 'date', label: 'Date' }, { key: 'value', label: 'Value' }, { key: 'note', label: 'Context' }]} label="Portfolio history" /></Panel>;
  return <Panel title="Your holdings" subtitle="Sample positions and their current values."><RecordsTable rows={holdings} columns={[
    { key: 'symbol', label: 'Instrument', render: row => <span><strong>{row.symbol}</strong><span className="muted"> · {row.name}</span></span> },
    { key: 'quantity', label: 'Quantity', numeric: true }, { key: 'price', label: 'Price', numeric: true, render: row => currency(row.price, 2) },
    { key: 'value', label: 'Value', numeric: true, render: row => currency(row.value) }, { key: 'sector', label: 'Sector' },
  ]} label="Portfolio holdings" searchPlaceholder="Search your holdings…" onRow={row => openRecord({ ...row, title: row.symbol, type: 'Sample portfolio holding' })} /></Panel>;
}
