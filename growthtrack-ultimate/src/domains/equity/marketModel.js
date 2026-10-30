export function filterQuotes(quotes, search, order) {
  const direction = order === 'losers' ? 1 : -1;
  return quotes.filter(row => row.symbol.toLowerCase().includes(search.trim().toLowerCase())).sort(order === 'symbol' ? (a, b) => a.symbol.localeCompare(b.symbol) : (a, b) => {
    const first = order === 'price' ? a.ltp : a.changePercent, second = order === 'price' ? b.ltp : b.changePercent;
    if (first === null) return 1; if (second === null) return -1;
    return (first - second) * direction || a.symbol.localeCompare(b.symbol);
  });
}
