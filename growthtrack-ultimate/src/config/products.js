export const PRODUCT_UI_ROOT = '/Ultimate/products';

export const PRODUCTS = Object.freeze([
  {
    id: 'finsync', name: 'FinSync', icon: '💳', color: '#34C759',
    description: 'Budgeting, transactions, banking sync, and financial planning.',
    uiUrl: `${PRODUCT_UI_ROOT}/finsync/`, apiPrefix: '/api/finsync',
    healthUrl: '/api/finsync/health', command: 'npm run dev:finsync',
    callbackUrl: `${PRODUCT_UI_ROOT}/finsync/auth/ultimate/callback`, capabilities: ['web', 'mobile', 'finance'],
  },
  {
    id: 'oxfin', name: 'OxFin', icon: '🏦', color: '#0A84FF',
    description: 'Wallets, cards, bills, investments, and financial intelligence.',
    uiUrl: `${PRODUCT_UI_ROOT}/oxfin/`, apiPrefix: '/api/oxfin',
    healthUrl: '/api/oxfin/health', command: 'npm run dev:oxfin',
    callbackUrl: `${PRODUCT_UI_ROOT}/oxfin/auth/ultimate/callback`, capabilities: ['web', 'finance', 'ai'],
  },
  {
    id: 'forex', name: 'Forex', icon: '📈', color: '#BF5AF2',
    description: 'Exchange-rate forecasting, model analytics, and prediction APIs.',
    uiUrl: `${PRODUCT_UI_ROOT}/forex/`, apiPrefix: '/api/forex',
    healthUrl: '/api/forex/health', command: 'npm run dev:forex',
    callbackUrl: `${PRODUCT_UI_ROOT}/forex/`, capabilities: ['python', 'ml', 'analytics'],
  },
  {
    id: 'family', name: 'Family Connect', icon: '🌳', color: '#FF9F0A',
    description: 'Family trees, shared memories, events, and private documents.',
    uiUrl: `${PRODUCT_UI_ROOT}/family/`, apiPrefix: '/api/family',
    healthUrl: '/api/family/health', command: 'npm run dev:family',
    callbackUrl: `${PRODUCT_UI_ROOT}/family/auth/ultimate/callback`, capabilities: ['web', 'family', 'documents'],
  },
  {
    id: 'equity', name: 'Equity / NiftyLens', icon: '📊', color: '#FF375F',
    description: 'Indian market charts, indicators, option chains, and alerts.',
    uiUrl: `${PRODUCT_UI_ROOT}/equity/`, apiPrefix: '/api/equity',
    healthUrl: '/api/equity/health', command: 'npm run dev:equity',
    callbackUrl: `${PRODUCT_UI_ROOT}/equity/auth/ultimate/callback`, capabilities: ['web', 'markets', 'analytics'],
  },
]);

export const productById = id => PRODUCTS.find(product => product.id === id);
