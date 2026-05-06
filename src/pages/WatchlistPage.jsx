import { useState, useEffect, useRef } from 'react'
import { Bookmark, Plus, Share2, Copy, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import MovieCard from '../components/MovieCard'
import SortableWatchlistTabs from '../components/SortableWatchlistTabs'
import { getWatchlistMovies, removeFromWatchlist, addToWatchlist, getAllWatchlistEntries } from '../services/watchlist'
import { getWatchlists, createWatchlist, deleteWatchlist, saveWatchlistOrder, getOrCreateDefaultWatchlist, renameWatchlist } from '../services/watchlists'
import { getMovieTrailerKey, getMovieRecommendations, getMovieDetails, discoverByDirector, discoverMovies } from '../services/tmdb'
import { genreLabel } from '../utils/genres'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Spinner } from '../components/ui/spinner'
import { Separator } from '../components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog'

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('added')
  const [filterGenre, setFilterGenre] = useState('')
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
      toast.info('Removed from watchlist')
    } catch {
      toast.error('Failed to remove')
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
      toast.error('Failed to create watchlist')
    }
  }

  const handleReorder = (reordered) => {
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
      toast.error('Failed to rename watchlist')
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
      Promise.all(seeds.map((m) => getMovieRecommendations(m.tmdbId))),
      Promise.all(seeds.map((m) => getMovieDetails(m.tmdbId))),
    ])
      .then(async ([recResults, detailResults]) => {
        const seenDirs = new Set()
        const directorIds = []
        for (const d of detailResults) {
          const dir = d.credits?.crew?.find((c) => c.job === 'Director')
          if (dir && !seenDirs.has(dir.id)) { seenDirs.add(dir.id); directorIds.push(dir.id) }
          if (directorIds.length >= 3) break
        }
        directorIdsRef.current = directorIds

        const [dirFilms, genreFilms] = await Promise.all([
          Promise.all(directorIds.map((id) => discoverByDirector({ personId: id, page: 1 }))),
          Promise.all(topGenres.map((genreId) => discoverMovies({ genreId, page: 1 }))),
        ])

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
      toast.success(`Added to "${wl?.name ?? 'watchlist'}"`)
    } catch {
      toast.error('Failed to add to watchlist')
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
      toast.info('Removed from watchlist')
    } catch {
      toast.error('Failed to remove from watchlist')
    }
  }

  const handleSuggestionCreateAndAdd = async (movie, name) => {
    try {
      const newList = await createWatchlist(name)
      setWatchlists((prev) => [...prev, newList])
      await handleSuggestionAdd(movie, newList.id)
    } catch {
      toast.error('Failed to create watchlist')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    try {
      await deleteWatchlist(deleteDialog.id)
      const next = watchlists.filter((w) => w.id !== deleteDialog.id)
      setWatchlists(next)
      setActiveTab(Math.min(activeTab, Math.max(0, next.length - 1)))
      setDeleteDialog(null)
    } catch {
      toast.error('Failed to delete watchlist')
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
      <div className="flex justify-center mt-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-1.5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Bookmark className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">My Watchlists</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary ml-1"
              onClick={() => setNewListDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New watchlist</TooltipContent>
        </Tooltip>
        {movies.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share watchlist</TooltipContent>
          </Tooltip>
        )}
      </div>

      {watchlists.length === 0 ? (
        <div className="text-center mt-20">
          <Bookmark className="h-16 w-16 text-muted mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No watchlists yet.</p>
          <Button onClick={() => setNewListDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first list
          </Button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-4">
            <SortableWatchlistTabs
              watchlists={watchlists}
              activeIndex={activeTab}
              onTabChange={(i) => { setActiveTab(i); setFilterGenre('') }}
              onDelete={(wl) => setDeleteDialog(wl)}
              onReorder={handleReorder}
              onEditRequest={(wl) => { setRenameDialog(wl); setRenameName(wl.name) }}
            />
          </div>

          {/* Filters */}
          {movies.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              <Select
                value={filterGenre || '__all__'}
                onValueChange={(v) => setFilterGenre(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <SelectValue placeholder="Filter by Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Genres</SelectItem>
                  {allGenres.map((g) => <SelectItem key={g} value={g}>{genreLabel(g)}</SelectItem>)}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-2 ${sortBy !== 'added' ? 'border-primary text-primary' : 'text-muted-foreground'}`}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {wlSortOptions.find((o) => o.value === sortBy)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {wlSortOptions.map((o) => (
                    <DropdownMenuItem
                      key={o.value}
                      onClick={() => setSortBy(o.value)}
                      className={sortBy === o.value ? 'text-primary' : ''}
                    >
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center mt-16">
              <Spinner />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center mt-20">
              <Bookmark className="h-16 w-16 text-muted mx-auto mb-3" />
              <p className="text-muted-foreground">
                {movies.length === 0 ? 'This list is empty. Search for movies to add some!' : 'No movies match that genre filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
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
            </div>
          )}

          {/* Suggestions */}
          {(loadingSuggestions || suggestions.length > 0) && (
            <div className="mt-24">
              <Separator className="mb-8" />
              <h2 className="text-xl font-bold mb-4">You might also like</h2>
              {loadingSuggestions ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
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
                  </div>
                  {hasMoreSuggestions && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={loadMoreSuggestions}
                        disabled={loadingMoreSuggestions}
                      >
                        {loadingMoreSuggestions ? <><Spinner size="sm" className="mr-2" />Loading…</> : 'Show more'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Share dialog */}
      <Dialog open={shareDialog} onOpenChange={setShareDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share "{activeWatchlist?.name}"</DialogTitle>
          </DialogHeader>
          {shareLoading ? (
            <div className="flex items-center gap-3 py-6">
              <Spinner size="sm" />
              <span className="text-sm text-muted-foreground">Fetching trailer links…</span>
            </div>
          ) : (
            <textarea
              readOnly
              value={shareText}
              rows={Math.min(movies.length + 2, 16)}
              className="w-full mt-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShareDialog(false)}>Close</Button>
            <Button
              onClick={() => { navigator.clipboard.writeText(shareText); setCopied(true) }}
              disabled={shareLoading}
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New list dialog */}
      <Dialog open={newListDialog} onOpenChange={setNewListDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>New watchlist</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <Label htmlFor="new-list-name">List name</Label>
            <Input
              id="new-list-name"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewListDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateList} disabled={!newListName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Rename "{renameDialog?.name}"</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <Label htmlFor="rename-list">List name</Label>
            <Input
              id="rename-list"
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameDialog(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameName.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete "{deleteDialog?.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the list and all movies in it.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
