import { expect, it } from 'vitest';
import { addAvatarPerson, avatarPeople, createAvatarPerson, patchAvatarPerson } from './avatarPeople';
import { BODY_METRICS, bodyProfileToMetrics, metricsToBodyProfile } from './physiqueProfile';
import { BODY_METRIC_RANGES } from './bodyMetricContract';

it('starts a person without copying the owner and preserves separate records when updating', () => {
  const initial = { goalMetrics: { waist: 80 }, privateMetrics: { anatomyLengthCm: 10 }, appearanceMetrics: { hairColor: '#111111' } };
  let records = addAvatarPerson(initial, createAvatarPerson('Buddy', 'male', 'buddy'));
  records = addAvatarPerson(records, createAvatarPerson('Alex', 'neutral', 'alex'));
  records = patchAvatarPerson(records, 'buddy', person => ({ bodyProfile: { ...person.bodyProfile, handLengthCm: 21 }, physiqueTargets: { goalMetrics: { handLength: 22 } } }));
  expect(records).toMatchObject(initial);
  expect(avatarPeople(records)[0]).toMatchObject({ id: 'buddy', bodyProfile: { handLengthCm: 21 }, physiqueTargets: { goalMetrics: { handLength: 22 } } });
  expect(avatarPeople(records)[1].bodyProfile).not.toHaveProperty('handLengthCm');
  expect(avatarPeople(records)[1].physiqueTargets).toEqual({});
  expect(avatarPeople(records)[0]).not.toHaveProperty('dateOfBirth');
  expect(() => patchAvatarPerson(records, 'missing', () => ({}))).toThrow('no longer available');
});

it('round trips every catalogued measurement through profile serialization', () => {
  const metrics = Object.fromEntries(BODY_METRICS.map(({key}) => [key, (BODY_METRIC_RANGES[key].min + BODY_METRIC_RANGES[key].max) / 2]));
  expect(new Set(BODY_METRICS.map(item => item.key)).size).toBe(BODY_METRICS.length);
  expect(bodyProfileToMetrics(metricsToBodyProfile(metrics))).toMatchObject(metrics);
  for (const key of ['torsoLength','upperArm','lowerArm','handLength','legLength','footLength','headCirc','leftWrist','rightWrist']) expect(metrics).toHaveProperty(key);
});

it('validates names, base selection and duplicate IDs', () => {
  expect(() => createAvatarPerson('  ')).toThrow('name');
  expect(() => createAvatarPerson('A'.repeat(61))).toThrow('name');
  expect(() => createAvatarPerson('Buddy', 'unknown')).toThrow('base');
  const person = createAvatarPerson(' Buddy ', 'male', 'buddy');
  expect(person.name).toBe('Buddy');
  expect(() => addAvatarPerson(addAvatarPerson({}, person), person)).toThrow('already exists');
});
