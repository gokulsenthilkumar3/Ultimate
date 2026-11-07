import tamilTerms from '../../../../Family Connect/familyconnect/backend/src/contracts/kinship.json';

export const BASE_RELATIONS = ['parent', 'child', 'spouse', 'sibling', 'cousin', 'aunt_uncle', 'niece_nephew', 'inlaw', 'friend', 'godparent', 'mentor', 'step_parent', 'step_child', 'adopted'];
export const KINSHIP = [...tamilTerms, ...BASE_RELATIONS.map(type => ({ id: `general-${type}`, group: 'General & chosen family', meaning: type.replaceAll('_', ' '), type }))];
export const kinshipLabel = item => item.tamil ? `${item.tamil} · ${item.roman} — ${item.meaning}` : item.meaning;
export const kinshipPayload = (key, label) => {
  const item = KINSHIP.find(value => value.id === key);
  if (!item) return null;
  return { type: item.type, ...(item.tamil ? { presetId: item.id } : {}), customLabel: label?.trim() || (item.tamil ? `${item.tamil} · ${item.roman} (${item.meaning})` : '') };
};

/** Only infer simple, recorded paths. Never guess maternal/paternal side or family-specific address. */
export function relationToMe(person, meId, members, relationships) {
  if (!meId) return '';
  if (person.id === meId) return 'Me · நான்';
  const direct = relationships.find(edge => edge.member1Id === person.id && edge.member2Id === meId);
  if (direct?.customLabel) return direct.customLabel;
  const parents = new Map();
  for (const edge of relationships) {
    const pair = ['parent', 'step_parent'].includes(edge.type) ? [edge.member1Id, edge.member2Id] : ['child', 'step_child'].includes(edge.type) ? [edge.member2Id, edge.member1Id] : null;
    if (pair) parents.set(pair[1], [...(parents.get(pair[1]) || []), pair[0]]);
  }
  if (parents.get(meId)?.includes(person.id)) return person.gender === 'female' ? 'Amma · அம்மா' : person.gender === 'male' ? 'Appa · அப்பா' : 'Parent';
  if (parents.get(person.id)?.includes(meId)) return person.gender === 'female' ? 'Daughter · மகள்' : person.gender === 'male' ? 'Son · மகன்' : 'Child';
  if (parents.get(meId)?.some(parent => parents.get(parent)?.includes(person.id))) return person.gender === 'female' ? 'Paati · பாட்டி' : person.gender === 'male' ? 'Thatha · தாத்தா' : 'Grandparent';
  if (parents.get(person.id)?.some(parent => parents.get(parent)?.includes(meId))) return 'Grandchild';
  const reverse = relationships.find(edge => edge.member1Id === meId && edge.member2Id === person.id);
  const type = direct?.type || reverse?.type;
  if (type && ['sibling', 'spouse', 'cousin', 'friend', 'inlaw'].includes(type)) return type === 'inlaw' ? 'In-law' : type[0].toUpperCase() + type.slice(1);
  return '';
}
