import axios from 'axios'

const BASE = 'https://api.themoviedb.org/3'
const KEY = import.meta.env.VITE_TMDB_API_KEY

export const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

const tmdb = axios.create({ baseURL: BASE })

export async function getGenres() {
  const { data } = await tmdb.get('/genre/movie/list', {
    params: { api_key: KEY, language: 'en-US' },
  })
  return data.genres
}

export async function searchMovies(query, page = 1) {
  const { data } = await tmdb.get('/search/movie', {
    params: { api_key: KEY, query, page, language: 'en-US' },
  })
  return data
}

export async function discoverMovies({ genreId, keywordId, companyId, page = 1 } = {}) {
  const params = { api_key: KEY, language: 'en-US', page, sort_by: 'popularity.desc' }
  if (genreId) params.with_genres = genreId
  if (keywordId) params.with_keywords = keywordId
  if (companyId) params.with_companies = companyId
  const { data } = await tmdb.get('/discover/movie', { params })
  return data
}

export const CUSTOM_GENRES = [
  { id: 'kw-10123', name: 'Dark Comedy', keywordId: 10123 },
  { id: 'kw-9748', name: 'Cult Classics', keywordId: 9748 },
  { id: 'kw-potflix', name: 'Potflix', keywordId: '10776|8224|243617|54169|245597|302399|367481' },
]

export const STUDIOS = [
  { id: 'a24', name: 'A24', companyId: '41077|293354' },
  { id: 'neon', name: 'NEON', companyId: '90733' },
]

export async function getMovieTrailerKey(tmdbId) {
  const { data } = await tmdb.get(`/movie/${tmdbId}/videos`, {
    params: { api_key: KEY, language: 'en-US' },
  })
  const trailer = data.results.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer'
  ) || data.results.find((v) => v.site === 'YouTube')
  return trailer?.key ?? null
}

export async function getMovieDetails(tmdbId) {
  const { data } = await tmdb.get(`/movie/${tmdbId}`, {
    params: { api_key: KEY, language: 'en-US', append_to_response: 'external_ids,credits' },
  })
  return data
}

export async function getMovieRecommendations(tmdbId, page = 1) {
  const { data } = await tmdb.get(`/movie/${tmdbId}/recommendations`, {
    params: { api_key: KEY, language: 'en-US', page },
  })
  return data.results || []
}

export async function discoverByDirector({ personId, page = 1 } = {}) {
  const { data } = await tmdb.get('/discover/movie', {
    params: { api_key: KEY, language: 'en-US', page, sort_by: 'popularity.desc', with_crew: personId },
  })
  return data
}
