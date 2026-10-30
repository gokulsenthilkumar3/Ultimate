import React, { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { filterQuotes } from './marketModel';
import Modal from '../../components/ui/Modal';
import PageState from '../../components/ui/PageState';
import { Card, Field, Metric, ModuleFrame, ModuleSkeleton, NativeTable, Pagination, QueryMessage, RefreshButton } from '../native/ModuleUI';
import { number, percentage } from '../native/format';

const EMPTY_QUOTES = [];
const TABS = [{ value: 'charts', label: 'Market watch' }, { value: 'movers', label: 'Movers' }, { value: 'connection', label: 'Data source' }];


export default function EquityPage({ view = 'charts', onViewChange }) {
  const { user } = useAuth();
  const [search, setSearch] = useState(''), [order, setOrder] = useState('symbol'), [page, setPage] = useState(0), [selected, setSelected] = useState(null);
  const deferredSearch = useDeferredValue(search);
  const query = useQuery({ queryKey: ['native-equity', user?.id], queryFn: ({ signal }) => apiClient.get('/api/native/equity/prices', { signal }), staleTime: 15_000, refetchInterval: 15_000, refetchIntervalInBackground: false, retry: false });
  const quotes = query.data?.quotes || EMPTY_QUOTES;
  const rows = useMemo(() => filterQuotes(quotes, deferredSearch, view === 'movers' && order === 'symbol' ? 'gainers' : order), [quotes, deferredSearch, view, order]);
  const boundedPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 25) - 1));
  const quote = quotes.find(row => row.symbol === selected);
  const dated = quotes.map(row => row.updatedAt).filter(Boolean).sort();
  const asOf = dated.at(-1), stale = asOf && query.dataUpdatedAt - Date.parse(asOf) > 120_000;
  const changeTone = value => value === null ? '' : value >= 0 ? 'native-change--up' : 'native-change--down';
  const columns = [
    { id: 'symbol', header: 'Symbol', render: row => <button type="button" className="native-link" onClick={() => setSelected(row.symbol)}>{row.symbol}</button> },
    { id: 'ltp', header: 'Last price', render: row => number(row.ltp) },
    { id: 'change', header: 'Change', render: row => <span className={changeTone(row.change)}>{row.change > 0 ? '+' : ''}{number(row.change)}</span> },
    { id: 'changePercent', header: 'Change %', render: row => <span className={changeTone(row.changePercent)}>{percentage(row.changePercent)}</span> },
    ...['open', 'high', 'low', 'volume'].map(id => ({ id, header: id[0].toUpperCase() + id.slice(1), render: row => number(row[id], id === 'volume' ? 0 : 2) })),
  ];
  return <ModuleFrame domain="equity" title="NiftyLens" subtitle="Your market watch, together in Ultimate." kind="siren" view={TABS.some(tab => tab.value === view) ? view : 'charts'} tabs={TABS} onViewChange={next => { setPage(0); onViewChange?.(next); }} actions={<RefreshButton query={query} />}>
    <QueryMessage query={query} title="Market quotes need attention" />
    {query.isPending ? <ModuleSkeleton label="Loading market quotes" /> : ['indices', 'options', 'chain'].includes(view) ? <PageState state="setup" title="This market feed is not connected" description="The existing NiftyLens app supplies price-cache quotes. Dedicated index and options-chain providers have not been configured." /> : view === 'connection' ? <Card title="A clear view of your data" description="Market quotes come from your existing NiftyLens price-cache connection."><div className="native-card__body"><dl className="native-detail-list"><div><dt>Provider</dt><dd>{query.data?.provider || 'Connection required'}</dd></div><div><dt>Refresh</dt><dd>Every 15 seconds while visible</dd></div><div><dt>Scope</dt><dd>Up to 200 cached symbols</dd></div><div><dt>Latest quote timestamp</dt><dd>{asOf ? new Date(asOf).toLocaleString() : 'Not supplied by the provider'}</dd></div></dl><p className="native-notice" style={{ marginTop: 24 }}>This is a snapshot of the configured cache. A recent fetch does not establish that every quote is current. Price history and options data require their own provider.</p></div></Card> : query.data && <>
      <div className="native-metrics"><Metric label="Symbols in this snapshot" value={number(quotes.length, 0)} detail={`Provider limit ${query.data.limit}`} /><Metric label="Above / below open" value={`${quotes.filter(row => row.change > 0).length} / ${quotes.filter(row => row.change < 0).length}`} detail="Only symbols with an opening price" /><Metric label="Quote freshness" value={asOf ? stale ? 'Older snapshot' : 'Recent timestamp' : 'Unknown'} detail={asOf ? new Date(asOf).toLocaleString() : 'No source timestamp supplied'} /></div>
      <Card title={view === 'movers' ? 'The day’s movement' : 'Market watch'} description="Change is calculated against the supplied opening price. Select a symbol for quote details." actions={<span className="native-status" role="status">{query.isFetching ? 'Refreshing snapshot…' : query.isError ? 'Showing last loaded snapshot' : 'Price-cache snapshot'}</span>}>
        <div className="native-toolbar"><Field label="Find a symbol"><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Search symbols…" /></Field><Field label="Sort quotes"><select value={view === 'movers' && order === 'symbol' ? 'gainers' : order} onChange={event => { setOrder(event.target.value); setPage(0); }}><option value="symbol">Symbol A–Z</option><option value="gainers">Largest gain %</option><option value="losers">Largest decline %</option><option value="price">Highest price</option></select></Field><ArrowDownUp size={16} aria-hidden="true" /></div>
        {rows.length ? <><NativeTable caption="NiftyLens market prices" columns={columns} rows={rows.slice(boundedPage * 25, boundedPage * 25 + 25)} rowKey="symbol" /><Pagination total={rows.length} page={boundedPage} onPage={setPage} /></> : <PageState state="empty" title={search ? 'No matching symbols' : 'No quotes in this cache'} description={search ? 'Try a shorter symbol or clear your search.' : 'The configured provider has not published price-cache records.'} />}
      </Card>
      <p className="native-notice">{query.data.provider} · Snapshot fetched {new Date(query.data.fetchedAt).toLocaleTimeString()}. {stale ? 'Quotes may be delayed or from a closed session. ' : ''}Source timestamps are available in quote details.</p>
    </>}
    <Modal open={Boolean(quote)} title={`${quote?.symbol || ''} · Quote details`} onClose={() => setSelected(null)}>{quote && <><div className="native-metrics" style={{ gridTemplateColumns: '1fr 1fr' }}><Metric label="Last price" value={number(quote.ltp)} detail="Provider quote" /><Metric label="From open" value={percentage(quote.changePercent)} detail={`Open ${number(quote.open)}`} /></div><div className="native-range"><p className="native-status">Supplied session range · {number(quote.low)} — {number(quote.high)}</p>{quote.high > quote.low && <div className="native-range__track"><span className="native-range__dot" style={{ left: `calc(${Math.max(0, Math.min(100, (quote.ltp - quote.low) / (quote.high - quote.low) * 100))}% - 7px)` }} /></div>}</div><dl className="native-detail-list"><div><dt>Volume</dt><dd>{number(quote.volume, 0)}</dd></div><div><dt>Source timestamp</dt><dd>{quote.updatedAt ? new Date(quote.updatedAt).toLocaleString() : 'Not provided'}</dd></div></dl><p className="native-notice" style={{ marginTop: 20 }}>A single quote does not contain a historical price series. The range above uses only the supplied low and high.</p></>}</Modal>
  </ModuleFrame>;
}
