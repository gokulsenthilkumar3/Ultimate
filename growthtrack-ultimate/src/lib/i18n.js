const messages = { en: { search: 'Search everything', loading: 'Loading', save: 'Save', cancel: 'Cancel', retry: 'Try again' }, es: { search: 'Buscar en todo', loading: 'Cargando', save: 'Guardar', cancel: 'Cancelar', retry: 'Intentar de nuevo' }, hi: { search: 'सब कुछ खोजें', loading: 'लोड हो रहा है', save: 'सहेजें', cancel: 'रद्द करें', retry: 'फिर कोशिश करें' } };
export const supportedLocales = Object.freeze(Object.keys(messages));
export function getLocale(preferred) { const value = String(preferred || globalThis.navigator?.language || 'en').toLowerCase().slice(0, 2); return messages[value] ? value : 'en'; }
export function t(key, locale = 'en') { return messages[getLocale(locale)]?.[key] || messages.en[key] || key; }
