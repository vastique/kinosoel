import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import SortIcon from '@mui/icons-material/Sort'
import MovieCard from '../components/MovieCard'
import { getWatchlist, removeFromWatchlist } from '../services/watchlist'

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('added')
  const [filterGenre, setFilterGenre] = useState('')
  const [snackbar, setSnackbar] = useState(null)

  useEffect(() => {
    getWatchlist()
      .then((data) => {
        setWatchlist(
          data.map((m) => ({
            tmdbId: m.tmdb_id,
            imdbId: m.imdb_id,
            title: m.title,
            posterPath: m.poster_path,
            year: m.year,
            genreIds: m.genre_ids,
            genreNames: m.genre_names || [],
            tmdbRating: m.tmdb_rating,
            rtScore: m.rt_score,
            addedAt: m.added_at,
          }))
        )
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const allGenres = [...new Set(watchlist.flatMap((m) => m.genreNames))]

  const filtered = filterGenre
    ? watchlist.filter((m) => m.genreNames.includes(filterGenre))
    : watchlist

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rt') return (b.rtScore ?? -1) - (a.rtScore ?? -1)
    if (sortBy === 'tmdb') return (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0)
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    return new Date(b.addedAt) - new Date(a.addedAt)
  })

  const handleRemove = async (tmdbId) => {
    try {
      await removeFromWatchlist(tmdbId)
      setWatchlist((prev) => prev.filter((m) => m.tmdbId !== tmdbId))
      setSnackbar({ severity: 'info', message: 'Removed from watchlist' })
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to remove' })
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <BookmarkIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          My Watchlist
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          ({watchlist.length} movies)
        </Typography>
      </Box>

      {watchlist.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel>Filter by Genre</InputLabel>
            <Select
              value={filterGenre}
              label="Filter by Genre"
              onChange={(e) => setFilterGenre(e.target.value)}
            >
              <MenuItem value="">All Genres</MenuItem>
              {allGenres.map((g) => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
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
              <ToggleButton value="added">Recently Added</ToggleButton>
              <ToggleButton value="rt">🍅 RT</ToggleButton>
              <ToggleButton value="tmdb">⭐ TMDB</ToggleButton>
              <ToggleButton value="title">A–Z</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}

      {sorted.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <BookmarkIcon sx={{ fontSize: 64, color: '#333', mb: 2 }} />
          <Typography color="text.secondary">
            {watchlist.length === 0
              ? 'Your watchlist is empty. Search for movies to add some!'
              : 'No movies match that genre filter.'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {sorted.map((movie) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={movie.tmdbId}>
              <MovieCard
                movie={movie}
                onRemove={handleRemove}
                inWatchlist={true}
                loadingRt={false}
              />
            </Grid>
          ))}
        </Grid>
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
