// Score-beregning for alle medietyper

/** Gennemsnit af et array af tal (ignorerer null/NaN) */
export function avg(nums) {
  const v = (nums ?? []).filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Gennemsnit af aktiverede kategori-scores { 'Instruktion': 8.5, ... } */
export function categoryAvg(cats = {}) {
  return avg(Object.values(cats));
}

/** Gennemsnit af numre-scores [{ score: 8.5 }, ...] */
export function trackAvg(tracks = []) {
  return avg(tracks.map(t => t.score));
}

/** Gennemsnit af sæson-scores [{ score: 8.5 }, ...] */
export function seasonAvg(seasons = []) {
  return avg(seasons.map(s => s.score));
}

/**
 * Beregn samlet score for et medie-item.
 * - Serier:  gennemsnit af sæsoner
 * - Musik:   60 % kategori-avg + 40 % track-avg  (fallback hvis kun ét sæt)
 * - Øvrige:  kategori-gennemsnit
 */
export function computeRating(categoryId, ratings = {}) {
  if (!ratings) return null;
  const { categories = {}, tracks = [], seasons = [] } = ratings;

  if (categoryId === 'series') {
    return round1(seasonAvg(seasons));
  }

  const catAvg = categoryAvg(categories);

  if (categoryId === 'music') {
    const tAvg = trackAvg(tracks);
    if (catAvg != null && tAvg != null) return round1(catAvg * 0.6 + tAvg * 0.4);
    return round1(catAvg ?? tAvg);
  }

  return round1(catAvg);
}

/** Rund til én decimal */
export function round1(n) {
  return n != null ? Math.round(n * 10) / 10 : null;
}
