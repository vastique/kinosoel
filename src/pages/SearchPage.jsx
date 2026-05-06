import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import MovieCard from '../components/MovieCard'
import { getGenres, searchMovies, discoverMovies, discoverByDirector, getMovieDetails, CUSTOM_GENRES, STUDIOS } from '../services/tmdb'
import { getRtScores } from '../services/omdb'
import { genreLabel } from '../utils/genres'
import { addToWatchlist, removeFromWatchlist, getAllWatchlistEntries } from '../services/watchlist'
import { getWatchlists, createWatchlist } from '../services/watchlists'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Spinner } from '../components/ui/spinner'
import { Badge } from '../components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

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
  const [watchlistMap, setWatchlistMap] = useState({})

  useEffect(() => {
    getGenres().then(setGenres).catch(console.error)
    getWatchlists().then(setWatchlists).catch(console.error)
    getAllWatchlistEntries().then(setWatchlistMap).catch(console.error)
  }, [])

  const genreMap = useMemo(
    () => Object.fromEntries(genres.map((g) => [g.id, g.name])),
    [genres]
  )

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
      toast.success(`Added to "${wl?.name ?? 'watchlist'}"`)
    } catch {
      toast.error('Failed to add to watchlist')
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
      toast.info('Removed from watchlist')
    } catch {
      toast.error('Failed to remove from watchlist')
    }
  }

  const handleCreateAndAdd = async (movie, name) => {
    try {
      const newList = await createWatchlist(name)
      setWatchlists((prev) => [...prev, newList])
      await handleAdd(movie, newList.id)
    } catch {
      toast.error('Failed to create watchlist')
    }
  }

  const sortOptions = [
    { value: 'popularity', label: 'Popular' },
    { value: 'recent', label: 'Recent' },
    { value: 'rt', label: 'Rotten Tomatoes' },
    { value: 'tmdb', label: 'TMDB' },
  ]

  const currentSortLabel = sortOptions.find((o) => o.value === sortBy)?.label

  return (
    <div className="p-1.5 sm:p-6">
      {/* Controls */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search movies…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>

        {/* Genre + Studio */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={selectedGenre || '__all__'} onValueChange={(v) => { setSelectedGenre(v === '__all__' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Genres</SelectItem>
              {CUSTOM_GENRES.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
              {genres.map((g) => <SelectItem key={g.id} value={String(g.id)}>{genreLabel(g.name)}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedStudio || '__all__'} onValueChange={(v) => { setSelectedStudio(v === '__all__' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Studio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Studios</SelectItem>
              {STUDIOS.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`gap-2 w-full sm:w-auto ${sortBy !== 'popularity' ? 'border-primary text-primary' : 'text-muted-foreground'}`}
            >
              <ArrowUpDown className="h-4 w-4" />
              {currentSortLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sortOptions.map((o) => (
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

      {/* Director filter chip */}
      {selectedDirector && (
        <div className="mb-3">
          <Badge variant="outline" className="gap-1 pl-3 pr-2 py-1 text-sm border-primary text-primary">
            Director: {selectedDirector.name}
            <button
              onClick={() => { setSelectedDirector(null); setPage(1) }}
              className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center mt-16">
          <Spinner />
        </div>
      ) : sortedMovies.length === 0 ? (
        <p className="text-center text-muted-foreground mt-16">
          No movies found. Try a different search.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
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
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="icon"
                onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="w-9 h-9"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              disabled={page === totalPages}
              onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
