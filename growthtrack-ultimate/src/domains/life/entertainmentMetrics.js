const finite = value => value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value);
export function entertainmentMetrics(media = []) {
  const summary = { total: media.length, watching: 0, completed: 0, backlog: 0, films: 0, episodes: 0, videos: 0, knownWatchMinutes: 0, durationCoverage: 0, rated: 0, ratingTotal: 0 };
  for (const item of media) {
    if (item.status === 'Watching') summary.watching++;
    if (item.status === 'Completed') summary.completed++;
    if (item.status === 'Plan to Watch') summary.backlog++;
    const episodic = ['Series', 'Anime'].includes(item.type);
    const units = episodic ? Math.floor(finite(item.episode) || 0) : item.status === 'Completed' ? 1 : 0;
    if (episodic) summary.episodes += units;
    else if (item.type === 'Movie') summary.films += units;
    else if (item.type === 'YouTube') summary.videos += units;
    const duration = finite(item.durationMinutes);
    if (duration !== null && units > 0) { summary.knownWatchMinutes += duration * units; summary.durationCoverage += units; }
    const rating = finite(item.rating);
    if (rating !== null && rating <= 10) { summary.rated++; summary.ratingTotal += rating; }
  }
  return { ...summary, avgRating: summary.rated ? (summary.ratingTotal / summary.rated).toFixed(1) : '—',
    averageMinutes: summary.durationCoverage ? Math.round(summary.knownWatchMinutes / summary.durationCoverage) : null };
}
