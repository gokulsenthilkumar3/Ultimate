import catalog from '../config/technologyCatalog.json';

const ids = new Set(catalog.technologies.map(item => item.id));
export const TECHNOLOGY_CATALOG = catalog;
export function validateTechnologyProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.selected)
    || Object.keys(value).some(key => !['version', 'selected'].includes(key)) || value.selected.length > ids.size
    || value.selected.some(id => typeof id !== 'string' || !ids.has(id)) || new Set(value.selected).size !== value.selected.length) throw new Error('Choose only supported catalog entries; profiles cannot contain credentials, endpoints or commands.');
  return { version: 1, selected: [...value.selected].sort() };
}
export function technologyProfileKey(ownerId) { return `growthtrack-technology-profile:${encodeURIComponent(ownerId)}`; }
