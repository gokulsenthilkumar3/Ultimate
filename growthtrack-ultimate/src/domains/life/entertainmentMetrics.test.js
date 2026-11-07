import { expect, it } from 'vitest';
import { entertainmentMetrics } from './entertainmentMetrics';
it('separates films, episodes and YouTube viewing without inventing missing durations', () => {
  const result = entertainmentMetrics([
    { type: 'Movie', status: 'Completed', durationMinutes: 120, rating: 8 },
    { type: 'Series', status: 'Watching', episode: 3, durationMinutes: 40 },
    { type: 'Anime', status: 'Plan to Watch', episode: 0 },
    { type: 'YouTube', status: 'Completed' },
    { type: 'Movie', status: 'Completed', durationMinutes: '' },
  ]);
  expect(result).toMatchObject({ films: 2, episodes: 3, videos: 1, watching: 1, backlog: 1, knownWatchMinutes: 240, durationCoverage: 4, averageMinutes: 60, avgRating: '8.0' });
  expect(entertainmentMetrics([{ type: 'Movie', status: 'Completed' }]).averageMinutes).toBeNull();
});
