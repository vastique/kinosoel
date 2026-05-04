import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Box, TextField, Select, MenuItem, FormControl, InputLabel,
  Typography, CircularProgress, Pagination, InputAdornment,
  Snackbar, Alert, Chip, Button, Menu,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import SortIcon from '@mui/icons-material/Sort'
import MovieCard from '../components/MovieCard'
import { getGenres, searchMovies, discoverMovies, discoverByDirector, getMovieDetails, CUSTOM_GENRES, STUDIOS } from '../services/tmdb'
import { getRtScores } from '../services/omdb'
import { genreLabel } from '../utils/genres'
import { addToWatchlist, removeFromWatchlist, getAllWatchlistEntries } from '../services/watchlist'
import { getWatchlists, createWatchlist } from '../services/watchlists'

export default function SearchPage() {
  const location = useLocation()

  useEffect(() => {
    if (location.state?.reset) {
      setQuery('')
      setSelectedGenre('')
      setSelectedStudio('')
      setSelectedDirector(null)
      setSortBy('popularity')
      setPage(1)
    }
  }, [location.state?.reset])

  const [query, setQuery] = useState('')
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedStudio, setSelectedStudio] = useState('')
  const [selectedDirector, setSelectedDirector] = useState(null)
  const [directors, setDirectors] = useState({})
  const [sortBy, setSortBy] = useState('popularity')
  const [movies, setMovies] = useState([])
  const [rtScores, setRtScores] = useState({})
  const [loadingRt, setLoadingRt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [watchlists, setWatchlists] = useState([])
  // { [watchlistId]: Set<tmdbId> }
  const [watchlistMap, setWatchlistMap] = useState({})
  const [snackbar, setSnackbar] = useState(null)
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null)

  useEffect(() => {
    getGenres().then(setGenres).catch(console.error)
    getWatchlists().then(setWatchlists).catch(console.error)
    getAllWatchlistEntries().then(setWatchlistMap).catch(console.error)
  }, [])

  const genreMap = useMemo(
    () => Object.fromEntries(genres.map((g) => [g.id, g.name])),
    [genres]
  )

  // Returns Set of watchlistIds this movie belongs to
  const getMovieWatchlistIds = (tmdbId) => {
    const ids = new Set()
    for (const [wlId, tmdbIds] of Object.entries(watchlistMap)) {
      if (tmdbIds.has(tmdbId)) ids.add(wlId)
    }
    return ids
  }

  const fetchRtScores = useCallback(async (movieList) => {
    setLoadingRt(true)
    const details = await Promise.all(
      movieList.map(async (m) => {
        const d = await getMovieDetails(m.tmdbId)
        const dir = d.credits?.crew?.find((c) => c.job === 'Director')
        return {
          tmdbId: m.tmdbId,
          imdbId: d.external_ids?.imdb_id || d.imdb_id,
          director: dir ? { name: dir.name, personId: dir.id } : null,
        }
      })
    )
    const scores = await getRtScores(details.map(({ tmdbId, imdbId }) => ({ tmdbId, imdbId })))
    setRtScores((prev) => ({ ...prev, ...scores }))
    setDirectors((prev) => ({
      ...prev,
      ...Object.fromEntries(details.map(({ tmdbId, director }) => [tmdbId, director])),
    }))
    setLoadingRt(false)
  }, [])

  const fetchMovies = useCallback(async () => {
    setLoading(true)
    try {
      const custom = CUSTOM_GENRES.find((g) => g.id === selectedGenre)
      const studio = STUDIOS.find((s) => s.id === selectedStudio)
      const fetchPage = (p) => {
        if (selectedDirector) return discoverByDirector({ personId: selectedDirector.personId, page: p })
        if (query.trim()) return searchMovies(query.trim(), p)
        return discoverMovies({
          genreId: custom ? undefined : selectedGenre,
          keywordId: custom?.keywordId,
          companyId: studio?.companyId,
          page: p,
        })
      }
      const [page1, page2] = await Promise.all([fetchPage(page * 2 - 1), fetchPage(page * 2)])
      const seen = new Set()
      const combined = [...page1.results, ...page2.results].filter((m) => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      const normalized = combined.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        year: m.release_date?.slice(0, 4),
        posterPath: m.poster_path,
        genreIds: m.genre_ids,
        genreNames: (m.genre_ids || []).map((id) => genreMap[id]).filter(Boolean),
        tmdbRating: m.vote_average,
        rtScore: null,
        overview: m.overview || null,
      }))
      setMovies(normalized)
      setTotalPages(Math.min(Math.ceil(page1.total_pages / 2), 10))
      fetchRtScores(normalized)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [query, selectedGenre, selectedStudio, selectedDirector, page, genreMap, fetchRtScores])

  useEffect(() => {
    if (genres.length > 0) fetchMovies()
  }, [fetchMovies, genres])

  const sortedMovies = useMemo(() => {
    const withRt = movies.map((m) => ({ ...m, rtScore: rtScores[m.tmdbId] ?? null }))
    return [...withRt].sort((a, b) => {
      if (sortBy === 'rt') return (b.rtScore ?? -1) - (a.rtScore ?? -1)
      if (sortBy === 'tmdb') return (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0)
      if (sortBy === 'recent') return (b.year ?? '0').localeCompare(a.year ?? '0')
      return 0
    })
  }, [movies, rtScores, sortBy])

  const handleAdd = async (movie, watchlistId) => {
    try {
      await addToWatchlist(movie, watchlistId)
      setWatchlistMap((prev) => {
        const next = { ...prev }
        if (!next[watchlistId]) next[watchlistId] = new Set()
        next[watchlistId] = new Set([...next[watchlistId], movie.tmdbId])
        return next
      })
      const wl = watchlists.find((w) => w.id === watchlistId)
      setSnackbar({ severity: 'success', message: `Added to "${wl?.name ?? 'watchlist'}"` })
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to add to watchlist' })
    }
  }

  const handleRemove = async (tmdbId, watchlistId) => {
    try {
      await removeFromWatchlist(tmdbId, watchlistId)
      setWatchlistMap((prev) => {
        const next = { ...prev }
        if (next[watchlistId]) {
          next[watchlistId] = new Set([...next[watchlistId]].filter((id) => id !== tmdbId))
        }
        return next
      })
      setSnackbar({ severity: 'info', message: 'Removed from watchlist' })
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to remove from watchlist' })
    }
  }

  const handleCreateAndAdd = async (movie, name) => {
    try {
      const newList = await createWatchlist(name)
      setWatchlists((prev) => [...prev, newList])
      await handleAdd(movie, newList.id)
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to create watchlist' })
    }
  }

  const sortOptions = [
    { value: 'popularity', label: 'Popular' },
    { value: 'recent', label: 'Recent' },
    { value: 'rt', label: 'Rotten Tomatoes' },
    { value: 'tmdb', label: 'TMDB' },
  ]

  return (
    <Box sx={{ p: { xs: '6px', sm: 3 } }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Search movies…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          sx={{ flexGrow: 1, minWidth: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="disabled" />
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Genre + Studio — full width on mobile */}
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
          <FormControl sx={{ width: { xs: '100%', sm: 180 }, flex: { xs: 1, sm: 'none' } }}>
            <InputLabel>Genre</InputLabel>
            <Select value={selectedGenre} label="Genre" onChange={(e) => { setSelectedGenre(e.target.value); setPage(1) }}>
              <MenuItem value="">All Genres</MenuItem>
              {CUSTOM_GENRES.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              {genres.map((g) => <MenuItem key={g.id} value={g.id}>{genreLabel(g.name)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ width: { xs: '100%', sm: 150 }, flex: { xs: 1, sm: 'none' } }}>
            <InputLabel>Studio</InputLabel>
            <Select value={selectedStudio} label="Studio" onChange={(e) => { setSelectedStudio(e.target.value); setPage(1) }}>
              <MenuItem value="">All Studios</MenuItem>
              {STUDIOS.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Sort — icon+menu */}
        <Button
          onClick={(e) => setSortMenuAnchor(e.currentTarget)}
          variant="outlined"
          startIcon={<SortIcon />}
          sx={{
            height: 56,
            borderColor: sortBy !== 'popularity' ? 'primary.main' : 'divider',
            color: sortBy !== 'popularity' ? 'primary.main' : 'text.secondary',
            textTransform: 'none',
            whiteSpace: 'nowrap',
            width: { xs: '100%', sm: 'auto' },
            fontWeight: 400,
            fontSize: 16,
          }}
        >
          {sortOptions.find((o) => o.value === sortBy)?.label}
        </Button>
        <Menu
          anchorEl={sortMenuAnchor}
          open={!!sortMenuAnchor}
          onClose={() => setSortMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {sortOptions.map((o) => (
            <MenuItem
              key={o.value}
              selected={sortBy === o.value}
              onClick={() => { setSortBy(o.value); setSortMenuAnchor(null) }}
            >
              {o.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {selectedDirector && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Director: ${selectedDirector.name}`}
            onDelete={() => { setSelectedDirector(null); setPage(1) }}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}

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
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)', xl: 'repeat(8, 1fr)' },
            gap: 0,
          }}>
            {sortedMovies.map((movie) => (
              <MovieCard
                key={movie.tmdbId}
                movie={movie}
                watchlists={watchlists}
                movieWatchlistIds={getMovieWatchlistIds(movie.tmdbId)}
                onAdd={handleAdd}
                onRemove={handleRemove}
                onCreateAndAdd={(name) => handleCreateAndAdd(movie, name)}
                loadingRt={loadingRt && movie.rtScore === null}
                director={directors[movie.tmdbId] ?? null}
                onDirectorClick={(dir) => { setSelectedDirector(dir); setPage(1) }}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => { setPage(v); window.scrollTo({ top: 0, behavior: 'smooth' }) }} color="primary" shape="rounded" />
          </Box>
        </>
      )}

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snackbar && <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} variant="filled">{snackbar.message}</Alert>}
      </Snackbar>
    </Box>
  )
}
