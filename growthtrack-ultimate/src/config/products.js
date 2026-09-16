export const PRODUCTS = Object.freeze([
  {
    id: 'finsync', name: 'FinSync', icon: '💳', color: '#34C759',
    description: 'Budgeting, transactions, banking sync, and financial planning.',
    uiUrl: 'http://localhost:5101', apiPrefix: '/api/finsync',
    healthUrl: '/api/finsync/health', command: 'npm run dev:finsync',
    callbackUrl: 'http://localhost:5101/auth/ultimate/callback', capabilities: ['web', 'mobile', 'finance'],
  },
  {
    id: 'oxfin', name: 'OxFin', icon: '🏦', color: '#0A84FF',
    description: 'Wallets, cards, bills, investments, and financial intelligence.',
    uiUrl: 'http://localhost:5102', apiPrefix: '/api/oxfin',
    healthUrl: '/api/oxfin/health', command: 'npm run dev:oxfin',
    callbackUrl: 'http://localhost:5102/auth/ultimate/callback', capabilities: ['web', 'finance', 'ai'],
  },
  {
    id: 'forex', name: 'Forex', icon: '📈', color: '#BF5AF2',
    description: 'Exchange-rate forecasting, model analytics, and prediction APIs.',
    uiUrl: 'http://localhost:8501', apiPrefix: '/api/forex',
    healthUrl: '/api/forex/health', command: 'npm run dev:forex',
    callbackUrl: 'http://localhost:8501', capabilities: ['python', 'ml', 'analytics'],
  },
  {
    id: 'family', name: 'Family Connect', icon: '🌳', color: '#FF9F0A',
    description: 'Family trees, shared memories, events, and private documents.',
    uiUrl: 'http://localhost:5104', apiPrefix: '/api/family',
    healthUrl: '/api/family/health', command: 'npm run dev:family',
    callbackUrl: 'http://localhost:5104/auth/ultimate/callback', capabilities: ['web', 'family', 'documents'],
  },
  {
    id: 'equity', name: 'Equity / NiftyLens', icon: '📊', color: '#FF375F',
    description: 'Indian market charts, indicators, option chains, and alerts.',
    uiUrl: 'http://localhost:5105', apiPrefix: '/api/equity',
    healthUrl: '/api/equity/health', command: 'npm run dev:equity',
    callbackUrl: 'http://localhost:5105/auth/ultimate/callback', capabilities: ['web', 'markets', 'analytics'],
  },
]);

export const productById = id => PRODUCTS.find(product => product.id === id);
