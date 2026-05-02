import axios from 'axios'

const BASE = 'https://www.omdbapi.com'
const KEY = import.meta.env.VITE_OMDB_API_KEY

// Returns the Rotten Tomatoes score (0-100) or null
export async function getRtScore(imdbId) {
  if (!imdbId) return null
  try {
    const { data } = await axios.get(BASE, {
      params: { apikey: KEY, i: imdbId, tomatoes: true },
    })
    if (data.Response === 'False') return null
    const rt = data.Ratings?.find((r) => r.Source === 'Rotten Tomatoes')
    if (!rt) return null
    return parseInt(rt.Value, 10) // e.g. "84%" → 84
  } catch {
    return null
  }
}

// Fetches RT scores for a batch of { tmdbId, imdbId } objects
// Returns a map: { tmdbId: rtScore }
export async function getRtScores(movies) {
  const results = await Promise.all(
    movies.map(async ({ tmdbId, imdbId }) => {
      const score = await getRtScore(imdbId)
      return { tmdbId, score }
    })
  )
  return Object.fromEntries(results.map(({ tmdbId, score }) => [tmdbId, score]))
}
