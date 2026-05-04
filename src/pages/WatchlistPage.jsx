import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert,
  IconButton, TextField, Tooltip, Dialog, Divider, Menu,
  DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import SortIcon from '@mui/icons-material/Sort'
import AddIcon from '@mui/icons-material/Add'
import ShareIcon from '@mui/icons-material/Share'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import MovieCard from '../components/MovieCard'
import SortableWatchlistTabs from '../components/SortableWatchlistTabs'
import { getWatchlistMovies, removeFromWatchlist, addToWatchlist, getAllWatchlistEntries } from '../services/watchlist'
import { getWatchlists, createWatchlist, deleteWatchlist, saveWatchlistOrder, getOrCreateDefaultWatchlist, renameWatchlist } from '../services/watchlists'
import { getMovieTrailerKey, getMovieRecommendations, getMovieDetails, discoverByDirector, discoverMovies } from '../services/tmdb'
import { genreLabel } from '../utils/genres'

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('added')
  const [filterGenre, setFilterGenre] = useState('')
  const [snackbar, setSnackbar] = useState(null)
  const [newListDialog, setNewListDialog] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [renameDialog, setRenameDialog] = useState(null)
  const [renameName, setRenameName] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [loadingMoreSuggestions, setLoadingMoreSuggestions] = useState(false)
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(false)
  const [suggestionsPage, setSuggestionsPage] = useState(1)
  const directorIdsRef = useRef([])
  const [watchlistMap, setWatchlistMap] = useState({})
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null)
  const [shareDialog, setShareDialog] = useState(false)
  const [shareText, setShareText] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getAllWatchlistEntries().then(setWatchlistMap).catch(console.error)
  }, [])

  useEffect(() => {
    getOrCreateDefaultWatchlist()
      .then(() => getWatchlists())
      .then((lists) => {
        // Always put the default watchlist first
        const sorted = [
          ...lists.filter((w) => w.is_default),
          ...lists.filter((w) => !w.is_default),
        ]
        setWatchlists(sorted)
        setLoading(false)
      })
      .catch(console.error)
  }, [])

  const activeWatchlist = watchlists[activeTab]

  useEffect(() => {
    if (!activeWatchlist) return
    setLoading(true)
    getWatchlistMovies(activeWatchlist.id)
      .then((data) => {
        setMovies(data.map((m) => ({
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
        })))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeWatchlist])

  const allGenres = [...new Set(movies.flatMap((m) => m.genreNames))]

  const filtered = filterGenre ? movies.filter((m) => m.genreNames.includes(filterGenre)) : movies

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rt') return (b.rtScore ?? -1) - (a.rtScore ?? -1)
    if (sortBy === 'tmdb') return (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0)
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    if (sortBy === 'recent') return (b.year ?? '0').localeCompare(a.year ?? '0')
    return new Date(b.addedAt) - new Date(a.addedAt)
  })

  const handleRemove = async (tmdbId) => {
    if (!activeWatchlist) return
    try {
      await removeFromWatchlist(tmdbId, activeWatchlist.id)
      setMovies((prev) => prev.filter((m) => m.tmdbId !== tmdbId))
      setSnackbar({ severity: 'info', message: 'Removed from watchlist' })
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to remove' })
    }
  }

  const handleCreateList = async () => {
    if (!newListName.trim()) return
    try {
      const newList = await createWatchlist(newListName.trim())
      setWatchlists((prev) => [...prev, newList])
      setActiveTab(watchlists.length)
      setNewListName('')
      setNewListDialog(false)
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to create watchlist' })
    }
  }

  const handleReorder = (reordered) => {
    // Keep default pinned first
    const pinned = reordered.filter((w) => w.is_default)
    const custom = reordered.filter((w) => !w.is_default)
    const final = [...pinned, ...custom]
    setWatchlists(final)
    saveWatchlistOrder(final.map((w) => w.id)).catch(console.error)
  }

  const handleRename = async () => {
    if (!renameDialog || !renameName.trim()) return
    try {
      await renameWatchlist(renameDialog.id, renameName.trim())
      setWatchlists((prev) => prev.map((w) => w.id === renameDialog.id ? { ...w, name: renameName.trim() } : w))
      setRenameDialog(null)
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to rename watchlist' })
    }
  }

  const handleShare = async () => {
    setShareDialog(true)
    setShareLoading(true)
    setCopied(false)
    try {
      const lines = await Promise.all(
        movies.map(async (m) => {
          const key = await getMovieTrailerKey(m.tmdbId)
          const trailer = key ? `https://youtu.be/${key}` : '(no trailer)'
          return `${m.title}${m.year ? ` (${m.year})` : ''} — ${trailer}`
        })
      )
      setShareText(`${activeWatchlist.name}\n\n${lines.join('\n')}`)
    } finally {
      setShareLoading(false)
    }
  }

  useEffect(() => {
    if (movies.length === 0) { setSuggestions([]); setHasMoreSuggestions(false); return }

    const inWatchlist = new Set(movies.map((m) => m.tmdbId))
    const seeds = movies.slice(0, 5)

    // Top 2 genres by frequency across the watchlist
    const genreCount = {}
    for (const m of movies) {
      for (const g of (m.genreIds || [])) genreCount[g] = (genreCount[g] || 0) + 1
    }
    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => id)

    setLoadingSuggestions(true)
    setSuggestionsPage(1)
    setHasMoreSuggestions(false)

    Promise.all([
      // Recommendations for each seed movie
      Promise.all(seeds.map((m) => getMovieRecommendations(m.tmdbId))),
      // Movie details to extract directors
      Promise.all(seeds.map((m) => getMovieDetails(m.tmdbId))),
    ])
      .then(async ([recResults, detailResults]) => {
        // Extract up to 3 unique directors
        const seenDirs = new Set()
        const directorIds = []
        for (const d of detailResults) {
          const dir = d.credits?.crew?.find((c) => c.job === 'Director')
          if (dir && !seenDirs.has(dir.id)) { seenDirs.add(dir.id); directorIds.push(dir.id) }
          if (directorIds.length >= 3) break
        }
        directorIdsRef.current = directorIds

        // Fetch director films + genre discovery in parallel
        const [dirFilms, genreFilms] = await Promise.all([
          Promise.all(directorIds.map((id) => discoverByDirector({ personId: id, page: 1 }))),
          Promise.all(topGenres.map((genreId) => discoverMovies({ genreId, page: 1 }))),
        ])

        // Score candidates: recommendations=3pts, director=2pts, genre=1pt
        const scores = {}
        const add = (list, weight) => {
          for (const m of list) {
            if (!m?.id || inWatchlist.has(m.id)) continue
            if (!scores[m.id]) scores[m.id] = { movie: m, score: 0 }
            scores[m.id].score += weight
          }
        }

        recResults.forEach((r) => add(r, 3))
        dirFilms.forEach((r) => add(r.results || [], 2))
        genreFilms.forEach((r) => add(r.results || [], 1))

        const ranked = Object.values(scores)
          .sort((a, b) => b.score - a.score || (b.movie.popularity || 0) - (a.movie.popularity || 0))
          .slice(0, 16)
          .map(({ movie: m }) => ({
            tmdbId: m.id,
            title: m.title,
            year: m.release_date?.slice(0, 4),
            posterPath: m.poster_path,
            genreIds: m.genre_ids || [],
            genreNames: [],
            tmdbRating: m.vote_average,
            rtScore: null,
          }))

        for (let i = ranked.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ranked[i], ranked[j]] = [ranked[j], ranked[i]]
        }

        setSuggestions(ranked)
        setHasMoreSuggestions(ranked.length > 0)
      })
      .catch(console.error)
      .finally(() => setLoadingSuggestions(false))
  }, [movies])

  const getSuggestionWatchlistIds = (tmdbId) => {
    const ids = new Set()
    for (const [wlId, tmdbIds] of Object.entries(watchlistMap)) {
      if (tmdbIds.has(tmdbId)) ids.add(wlId)
    }
    return ids
  }

  const loadMoreSuggestions = async () => {
    const nextPage = suggestionsPage + 1
    const inWatchlist = new Set(movies.map((m) => m.tmdbId))
    const alreadyShown = new Set(suggestions.map((s) => s.tmdbId))
    const exclude = new Set([...inWatchlist, ...alreadyShown])

    const seeds = movies.slice(0, 5)
    const genreCount = {}
    for (const m of movies) {
      for (const g of (m.genreIds || [])) genreCount[g] = (genreCount[g] || 0) + 1
    }
    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => id)

    setLoadingMoreSuggestions(true)
    try {
      const [recResults, dirFilms, genreFilms] = await Promise.all([
        Promise.all(seeds.map((m) => getMovieRecommendations(m.tmdbId, nextPage))),
        Promise.all(directorIdsRef.current.map((id) => discoverByDirector({ personId: id, page: nextPage }))),
        Promise.all(topGenres.map((genreId) => discoverMovies({ genreId, page: nextPage }))),
      ])

      const scores = {}
      const add = (list, weight) => {
        for (const m of list) {
          if (!m?.id || exclude.has(m.id)) continue
          if (!scores[m.id]) scores[m.id] = { movie: m, score: 0 }
          scores[m.id].score += weight
        }
      }

      recResults.forEach((r) => add(r, 3))
      dirFilms.forEach((r) => add(r.results || [], 2))
      genreFilms.forEach((r) => add(r.results || [], 1))

      const newMovies = Object.values(scores)
        .sort((a, b) => b.score - a.score || (b.movie.popularity || 0) - (a.movie.popularity || 0))
        .slice(0, 16)
        .map(({ movie: m }) => ({
          tmdbId: m.id,
          title: m.title,
          year: m.release_date?.slice(0, 4),
          posterPath: m.poster_path,
          genreIds: m.genre_ids || [],
          genreNames: [],
          tmdbRating: m.vote_average,
          rtScore: null,
        }))

      if (newMovies.length > 0) {
        setSuggestions((prev) => [...prev, ...newMovies])
        setSuggestionsPage(nextPage)
      }
      setHasMoreSuggestions(newMovies.length > 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMoreSuggestions(false)
    }
  }

  const handleSuggestionAdd = async (movie, watchlistId) => {
    try {
      await addToWatchlist(movie, watchlistId)
      setWatchlistMap((prev) => {
        const next = { ...prev }
        if (!next[watchlistId]) next[watchlistId] = new Set()
        next[watchlistId] = new Set([...next[watchlistId], movie.tmdbId])
        return next
      })
      if (watchlistId === activeWatchlist?.id) {
        setMovies((prev) => [...prev, { ...movie, addedAt: new Date().toISOString() }])
        setSuggestions((prev) => prev.filter((m) => m.tmdbId !== movie.tmdbId))
      }
      const wl = watchlists.find((w) => w.id === watchlistId)
      setSnackbar({ severity: 'success', message: `Added to "${wl?.name ?? 'watchlist'}"` })
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to add to watchlist' })
    }
  }

  const handleSuggestionRemove = async (tmdbId, watchlistId) => {
    try {
      await removeFromWatchlist(tmdbId, watchlistId)
      setWatchlistMap((prev) => {
        const next = { ...prev }
        if (next[watchlistId]) next[watchlistId] = new Set([...next[watchlistId]].filter((id) => id !== tmdbId))
        return next
      })
      if (watchlistId === activeWatchlist?.id) {
        setMovies((prev) => prev.filter((m) => m.tmdbId !== tmdbId))
      }
      setSnackbar({ severity: 'info', message: 'Removed from watchlist' })
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to remove from watchlist' })
    }
  }

  const handleSuggestionCreateAndAdd = async (movie, name) => {
    try {
      const newList = await createWatchlist(name)
      setWatchlists((prev) => [...prev, newList])
      await handleSuggestionAdd(movie, newList.id)
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to create watchlist' })
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    try {
      await deleteWatchlist(deleteDialog.id)
      const idx = watchlists.findIndex((w) => w.id === deleteDialog.id)
      const next = watchlists.filter((w) => w.id !== deleteDialog.id)
      setWatchlists(next)
      setActiveTab(Math.min(activeTab, Math.max(0, next.length - 1)))
      setDeleteDialog(null)
    } catch {
      setSnackbar({ severity: 'error', message: 'Failed to delete watchlist' })
    }
  }

  const wlSortOptions = [
    { value: 'added', label: 'Recently Added' },
    { value: 'recent', label: 'Newest' },
    { value: 'rt', label: 'Rotten Tomatoes' },
    { value: 'tmdb', label: 'TMDB' },
    { value: 'title', label: 'A–Z' },
  ]

  if (loading && watchlists.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: '6px', sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <BookmarkIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>My Watchlists</Typography>
        <Tooltip title="New watchlist">
          <IconButton size="small" color="primary" onClick={() => setNewListDialog(true)} sx={{ ml: 1 }}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        {movies.length > 0 && (
          <Tooltip title="Share watchlist">
            <IconButton size="small" onClick={handleShare} sx={{ ml: 0.5, color: '#888', '&:hover': { color: 'primary.main' } }}>
              <ShareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {watchlists.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <BookmarkIcon sx={{ fontSize: 64, color: '#333', mb: 2 }} />
          <Typography color="text.secondary" gutterBottom>No watchlists yet.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewListDialog(true)}>
            Create your first list
          </Button>
        </Box>
      ) : (
        <>
          {/* Tabs */}
          <Box sx={{ mb: 3 }}>
            <SortableWatchlistTabs
              watchlists={watchlists}
              activeIndex={activeTab}
              onTabChange={(i) => { setActiveTab(i); setFilterGenre('') }}
              onDelete={(wl) => setDeleteDialog(wl)}
              onReorder={handleReorder}
              onEditRequest={(wl) => { setRenameDialog(wl); setRenameName(wl.name) }}
            />
          </Box>

          {/* Filters */}
          {movies.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Genre filter — full width on mobile */}
              <FormControl sx={{ width: { xs: '100%', sm: 180 }, flex: { xs: 1, sm: 'none' } }} size="small">
                <InputLabel>Filter by Genre</InputLabel>
                <Select value={filterGenre} label="Filter by Genre" onChange={(e) => setFilterGenre(e.target.value)}>
                  <MenuItem value="">All Genres</MenuItem>
                  {allGenres.map((g) => <MenuItem key={g} value={g}>{genreLabel(g)}</MenuItem>)}
                </Select>
              </FormControl>

              {/* Sort — icon+menu */}
              <IconButton
                onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                sx={{ border: '1px solid', borderColor: sortBy !== 'added' ? 'primary.main' : 'divider', color: sortBy !== 'added' ? 'primary.main' : 'text.secondary', borderRadius: 1, height: 40, gap: 1, px: 1.5 }}
              >
                <SortIcon fontSize="small" />
                <Typography sx={{ fontSize: '1rem' }}>
                  {wlSortOptions.find((o) => o.value === sortBy)?.label}
                </Typography>
              </IconButton>
              <Menu anchorEl={sortMenuAnchor} open={!!sortMenuAnchor} onClose={() => setSortMenuAnchor(null)}>
                {wlSortOptions.map((o) => (
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
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : sorted.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 10 }}>
              <BookmarkIcon sx={{ fontSize: 64, color: '#333', mb: 2 }} />
              <Typography color="text.secondary">
                {movies.length === 0 ? 'This list is empty. Search for movies to add some!' : 'No movies match that genre filter.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)', xl: 'repeat(8, 1fr)' },
              gap: 0,
            }}>
              {sorted.map((movie) => (
                <MovieCard
                  key={movie.tmdbId}
                  movie={movie}
                  watchlists={watchlists}
                  movieWatchlistIds={new Set([activeWatchlist.id])}
                  onRemove={handleRemove}
                  onAdd={() => {}}
                  onCreateAndAdd={() => {}}
                  loadingRt={false}
                  showOutline={false}
                  deleteMode={true}
                />
              ))}
            </Box>
          )}

          {/* Suggestions */}
          {(loadingSuggestions || suggestions.length > 0) && (
            <Box sx={{ mt: 16 }}>
              <Divider sx={{ mb: 6 }} />
              <Typography fontWeight={700} sx={{ mb: 2, fontSize: 20 }}>
                You might also like
              </Typography>
              {loadingSuggestions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress color="primary" />
                </Box>
              ) : (
                <>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)', xl: 'repeat(8, 1fr)' },
                    gap: 0,
                  }}>
                    {suggestions.map((movie) => (
                      <MovieCard
                        key={movie.tmdbId}
                        movie={movie}
                        watchlists={watchlists}
                        movieWatchlistIds={getSuggestionWatchlistIds(movie.tmdbId)}
                        onAdd={handleSuggestionAdd}
                        onRemove={handleSuggestionRemove}
                        onCreateAndAdd={(name) => handleSuggestionCreateAndAdd(movie, name)}
                        loadingRt={false}
                        showOutline={true}
                      />
                    ))}
                  </Box>
                  {hasMoreSuggestions && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                      <Button
                        variant="outlined"
                        onClick={loadMoreSuggestions}
                        disabled={loadingMoreSuggestions}
                        startIcon={loadingMoreSuggestions ? <CircularProgress size={16} color="inherit" /> : null}
                      >
                        {loadingMoreSuggestions ? 'Loading…' : 'Show more'}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </>
      )}

      {/* Share dialog */}
      <Dialog open={shareDialog} onClose={() => setShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share "{activeWatchlist?.name}"</DialogTitle>
        <DialogContent>
          {shareLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Fetching trailer links…</Typography>
            </Box>
          ) : (
            <TextField
              fullWidth
              multiline
              value={shareText}
              rows={Math.min(movies.length + 2, 16)}
              slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: 13 } } }}
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={() => { navigator.clipboard.writeText(shareText); setCopied(true) }}
            disabled={shareLoading}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New list dialog */}
      <Dialog open={newListDialog} onClose={() => setNewListDialog(false)} maxWidth="xs" fullWidth disableRestoreFocus>
        <DialogTitle>New watchlist</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="List name" value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewListDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateList} disabled={!newListName.trim()}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameDialog} onClose={() => setRenameDialog(null)} maxWidth="xs" fullWidth disableRestoreFocus>
        <DialogTitle>Rename "{renameDialog?.name}"</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="List name" value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleRename} disabled={!renameName.trim()}>Rename</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs">
        <DialogTitle>Delete "{deleteDialog?.name}"?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete the list and all movies in it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snackbar && <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} variant="filled">{snackbar.message}</Alert>}
      </Snackbar>
    </Box>
  )
}
