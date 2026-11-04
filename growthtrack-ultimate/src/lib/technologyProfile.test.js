import { expect, it } from 'vitest';
import { TECHNOLOGY_CATALOG, technologyProfileKey, validateTechnologyProfile } from './technologyProfile';
it('lists the requested technologies and validates selections without executable settings', () => {
  const ids = TECHNOLOGY_CATALOG.technologies.map(item => item.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ['json', 'graphql', 'rest', 'microservices', 'serverless', 'modular-monolith', 'cdn', 'redis', 'memcached', 'github', 'gitlab', 'bitbucket', 'jenkins', 'circleci', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'vercel', 'gpt', 'claude', 'gemini', 'deepseek', 'mistral', 'llama', 'spring-boot', 'nodejs', 'django', 'ruby-on-rails', 'fastapi', 'langchain', 'postgresql', 'mysql', 'oracle', 'mongodb', 'dynamodb', 'sqlite', 'apache-cassandra', 'java', 'python', 'csharp', 'ruby', 'php', 'javascript', 'rust', 'go', 'swift', 'laya', 'mern']) expect(ids).toContain(id);
  expect(validateTechnologyProfile({ version: 1, selected: ['redis', 'mern'] })).toEqual({ version: 1, selected: ['mern', 'redis'] });
  for (const value of [{ version: 1, selected: ['invented'] }, { version: 1, selected: ['redis', 'redis'] }, { version: 1, selected: [], apiKey: 'fictional' }, { version: 2, selected: [] }]) expect(() => validateTechnologyProfile(value)).toThrow();
  expect(technologyProfileKey('owner-a')).not.toBe(technologyProfileKey('owner-b'));
});
