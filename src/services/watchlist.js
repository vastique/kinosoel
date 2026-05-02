import { supabase, OWNER_ID } from './supabase'

export async function getWatchlist() {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('owner_id', OWNER_ID)
    .order('added_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addToWatchlist(movie) {
  const { error } = await supabase.from('watchlist').insert({
    owner_id: OWNER_ID,
    tmdb_id: movie.tmdbId,
    imdb_id: movie.imdbId,
    title: movie.title,
    poster_path: movie.posterPath,
    year: movie.year,
    genre_ids: movie.genreIds,
    tmdb_rating: movie.tmdbRating,
    rt_score: movie.rtScore,
  })
  if (error) throw error
}

export async function removeFromWatchlist(tmdbId) {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('owner_id', OWNER_ID)
    .eq('tmdb_id', tmdbId)
  if (error) throw error
}

export async function isInWatchlist(tmdbId) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('id')
    .eq('owner_id', OWNER_ID)
    .eq('tmdb_id', tmdbId)
    .maybeSingle()
  if (error) throw error
  return !!data
}
