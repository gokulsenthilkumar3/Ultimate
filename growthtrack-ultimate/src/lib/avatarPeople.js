export const SELF_PERSON_ID = 'self';
export const MAX_AVATAR_PEOPLE = 30;

export function avatarPeople(targets) {
  const records = targets?.avatarPeople?.people;
  return Array.isArray(records) ? records.filter(person => person && typeof person.id === 'string' && person.id !== SELF_PERSON_ID) : [];
}

export function createAvatarPerson(name, base = 'male', id = crypto.randomUUID()) {
  const label = String(name || '').trim();
  if (!label || label.length > 60) throw new Error('Enter a name of 1–60 characters.');
  if (!['male', 'female', 'neutral'].includes(base)) throw new Error('Choose a body base.');
  return { id, name: label, bodyProfile: { biologicalSex: base, modelPreset: base, modelVersion: 'v2' }, physiqueTargets: {}, metricLogs: [] };
}

export function addAvatarPerson(targets, person) {
  const people = avatarPeople(targets);
  if (people.length >= MAX_AVATAR_PEOPLE) throw new Error(`You can save up to ${MAX_AVATAR_PEOPLE} people.`);
  if (people.some(item => item.id === person.id) || person.id === SELF_PERSON_ID) throw new Error('This person already exists.');
  return { ...targets, avatarPeople: { ...targets?.avatarPeople, schemaVersion: 1, activePersonId: person.id, people: [...people, person] } };
}

// Always resolve inside the existing serialized save queue, preserving edits
// to other people and to the owner's measurements/preferences.
export function patchAvatarPerson(targets, id, update) {
  const people = avatarPeople(targets);
  if (!people.some(person => person.id === id)) throw new Error('This person is no longer available.');
  return { ...targets, avatarPeople: { ...targets?.avatarPeople, schemaVersion: 1,
    people: people.map(person => person.id === id ? { ...person, ...update(person), id } : person) } };
}
