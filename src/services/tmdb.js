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

export async function discoverMovies({ genreId, page = 1 } = {}) {
  const params = { api_key: KEY, language: 'en-US', page, sort_by: 'popularity.desc' }
  if (genreId) params.with_genres = genreId
  const { data } = await tmdb.get('/discover/movie', { params })
  return data
}

export async function getMovieDetails(tmdbId) {
  const { data } = await tmdb.get(`/movie/${tmdbId}`, {
    params: { api_key: KEY, language: 'en-US', append_to_response: 'external_ids' },
  })
  return data
}
