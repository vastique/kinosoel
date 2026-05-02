import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  CircularProgress,
  Pagination,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import SortIcon from '@mui/icons-material/Sort'
import MovieCard from '../components/MovieCard'
import { getGenres, searchMovies, discoverMovies, getMovieDetails } from '../services/tmdb'
import { getRtScores } from '../services/omdb'
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../services/watchlist'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [sortBy, setSortBy] = useState('popularity')
  const [movies, setMovies] = useState([])
  const [rtScores, setRtScores] = useState({})
  const [loadingRt, setLoadingRt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [watchlistIds, setWatchlistIds] = useState(new Set())
  const [snackbar, setSnackbar] = useState(null)

  useEffect(() => {
    getGenres().then(setGenres).catch(console.error)
    getWatchlist()
      .then((wl) => setWatchlistIds(new Set(wl.map((m) => m.tmdb_id))))
      .catch(console.error)
  }, [])

  const genreMap = Object.fromEntries(genres.map((g) => [g.id, g.name]))

  const fetchRtScores = useCallback(async (movieList) => {
    setLoadingRt(true)
    const withImdb = await Promise.all(
      movieList.map(async (m) => {
        const details = await getMovieDetails(m.tmdbId)
        return { tmdbId: m.tmdbId, imdbId: details.external_ids?.imdb_id || details.imdb_id }
      })
    )
    const scores = await getRtScores(withImdb)
    setRtScores((prev) => ({ ...prev, ...scores }))
    setLoadingRt(false)
  }, [])

  const normalizeMovies = useCallback(
    (rawMovies) =>
      rawMovies.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        year: m.release_date?.slice(0, 4),
        posterPath: m.poster_path,
        genreIds: m.genre_ids,
        genreNames: (m.genre_ids || []).map((id) => genreMap[id]).filter(Boolean),
        tmdbRating: m.vote_average,
        rtScore: rtScores[m.id] ?? null,
      })),
    [genreMap, rtScores]
  )

  const fetchMovies = useCallback(async () => {
    setLoading(true)
    try {
      let data
      if (query.trim()) {
        data = await searchMovies(query.trim(), page)
      } else {
        data = await discoverMovies({ genreId: selectedGenre, page })
      }
      const normalized = data.results.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        year: m.release_date?.slice(0, 4),
        posterPath: m.poster_path,
        genreIds: m.genre_ids,
        genreNames: (m.genre_ids || []).map((id) => genreMap[id]).filter(Boolean),
        tmdbRating: m.vote_average,
        rtScore: null,
      }))
      setMovies(normalized)
      setTotalPages(Math.min(data.total_pages, 20))
      fetchRtScores(normalized)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [query, selectedGenre, page, genreMap, fetchRtScores])

  useEffect(() => {
    if (genres.length > 0) fetchMovies()
  }, [fetchMovies, genres])

  const moviesWithRt = movies.map((m) => ({
    ...m,
    rtScore: rtScores[m.tmdbId] ?? null,
  }))

  const sortedMovies = [...moviesWithRt].sort((a, b) => {
    if (sortBy === 'rt') {
      return (b.rtScore ?? -1) - (a.rtScore ?? -1)
    }
    if (sortBy === 'tmdb') {
      return (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0)
    }
    return 0
  })

  const handleAdd = async (movie) => {
    try {
      await addToWatchlist({ ...movie, imdbId: null })
      setWatchlistIds((prev) => new Set([...prev, movie.tmdbId]))
      setSnackbar({ severity: 'success', message: `"${movie.title}" added to watchlist` })
    } catch (err) {
      setSnackbar({ severity: 'error', message: 'Failed to add to watchlist' })
    }
  }

  const handleRemove = async (tmdbId) => {
    try {
      await removeFromWatchlist(tmdbId)
      setWatchlistIds((prev) => {
        const next = new Set(prev)
        next.delete(tmdbId)
        return next
      })
      setSnackbar({ severity: 'info', message: 'Removed from watchlist' })
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to remove from watchlist' })
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Search & Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Search movies…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          sx={{ flexGrow: 1, minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="disabled" />
              </InputAdornment>
            ),
          }}
        />

        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Genre</InputLabel>
          <Select
            value={selectedGenre}
            label="Genre"
            onChange={(e) => { setSelectedGenre(e.target.value); setPage(1) }}
          >
            <MenuItem value="">All Genres</MenuItem>
            {genres.map((g) => (
              <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SortIcon color="disabled" />
          <ToggleButtonGroup
            value={sortBy}
            exclusive
            onChange={(_, v) => v && setSortBy(v)}
            size="small"
          >
            <ToggleButton value="popularity">Popular</ToggleButton>
            <ToggleButton value="rt">🍅 RT</ToggleButton>
            <ToggleButton value="tmdb">⭐ TMDB</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Results */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : sortedMovies.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>
          No movies found. Try a different search.
        </Typography>
      ) : (
        <>
          <Grid container spacing={2}>
            {sortedMovies.map((movie) => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={movie.tmdbId}>
                <MovieCard
                  movie={movie}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  inWatchlist={watchlistIds.has(movie.tmdbId)}
                  loadingRt={loadingRt && movie.rtScore === null}
                />
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
              shape="rounded"
            />
          </Box>
        </>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar && (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} variant="filled">
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  )
}
