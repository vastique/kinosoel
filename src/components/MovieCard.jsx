import { useState } from 'react'
import { Info, Trash2 } from 'lucide-react'
import rtIcon from '../assets/rt-icon.svg'
import tmdbIcon from '../assets/tmdb-icon.svg'
import { POSTER_BASE, getMovieTrailerKey, getMovieDetails } from '../services/tmdb'
import { genreLabel } from '../utils/genres'
import TrailerModal from './TrailerModal'
import WatchlistMenu from './WatchlistMenu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'

export default function MovieCard({
  movie, loadingRt, director, onDirectorClick,
  watchlists, movieWatchlistIds,
  onAdd, onRemove, onCreateAndAdd,
  showOutline = true,
  deleteMode = false,
}) {
  const { tmdbId, title, year, posterPath, genreNames = [], tmdbRating, rtScore, overview } = movie

  const [trailerOpen, setTrailerOpen] = useState(false)
  const [trailerKey, setTrailerKey] = useState(null)
  const [trailerLoading, setTrailerLoading] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [synopsis, setSynopsis] = useState(overview || null)
  const [synopsisLoading, setSynopsisLoading] = useState(false)

  const handleInfoClick = async (e) => {
    e.stopPropagation()
    setInfoOpen(true)
    if (!synopsis) {
      setSynopsisLoading(true)
      const details = await getMovieDetails(tmdbId)
      setSynopsis(details.overview || '')
      setSynopsisLoading(false)
    }
  }

  const handleTrailerClick = async () => {
    setTrailerOpen(true)
    if (trailerKey === null) {
      setTrailerLoading(true)
      const key = await getMovieTrailerKey(tmdbId)
      setTrailerKey(key || '')
      setTrailerLoading(false)
    }
  }

  const inAnyList = movieWatchlistIds?.size > 0

  const poster = posterPath
    ? `${POSTER_BASE}${posterPath}`
    : 'https://placehold.co/500x750/1a1a1a/888?text=No+Poster'

  return (
    <>
      <div
        className="relative overflow-hidden cursor-pointer group"
        onClick={handleTrailerClick}
      >
        <img
          src={poster}
          alt={title}
          draggable={false}
          className="w-full aspect-[2/3] object-cover block select-none"
        />

        {/* Info button */}
        <button
          onClick={handleInfoClick}
          className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80 transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>

        {/* Gradient overlay — hidden by default, visible on hover */}
        <div
          className="overlay absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-4 pt-10 flex flex-col gap-2.5"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 50%, transparent 100%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title + year + director */}
          <div className="flex flex-col gap-1">
            <span className="font-bold text-base text-white leading-tight truncate" title={title}>
              {title}
            </span>
            <div className="flex gap-1.5 items-center overflow-hidden">
              <span className="text-[13px] text-white font-medium leading-tight shrink-0">
                {year || '—'}
              </span>
              {director && (
                <>
                  <span className="text-[13px] text-white font-medium shrink-0">•</span>
                  <span
                    className="text-[13px] text-white font-medium leading-tight cursor-pointer hover:text-primary overflow-hidden text-ellipsis truncate"
                    onClick={(e) => { e.stopPropagation(); onDirectorClick?.(director) }}
                  >
                    {director.name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Genre tags */}
          {genreNames.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {genreNames.slice(0, 2).map((g) => (
                <span
                  key={g}
                  className="border border-white/50 rounded-[6px] px-1.5 py-[3px] text-[11px] text-white/80 font-medium leading-tight whitespace-nowrap"
                >
                  {genreLabel(g)}
                </span>
              ))}
            </div>
          )}

          {/* Ratings + bookmark */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2.5 items-center">
              {rtScore != null && (
                <div className="flex items-center gap-1.5">
                  <img src={rtIcon} alt="RT" className="w-5 h-5 shrink-0" />
                  <span className="text-[13px] text-white font-medium leading-tight whitespace-nowrap">
                    {rtScore}%
                  </span>
                </div>
              )}
              {tmdbRating > 0 && (
                <div className="flex items-center gap-1.5">
                  <img src={tmdbIcon} alt="TMDB" className="w-5 h-5 shrink-0" />
                  <span className="text-[13px] text-white font-medium leading-tight whitespace-nowrap">
                    {tmdbRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {deleteMode ? (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmOpen(true) }}
                className="text-[#E50914] hover:text-[#ff4444] p-1 rounded"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <WatchlistMenu
                watchlists={watchlists ?? []}
                movieWatchlistIds={movieWatchlistIds}
                inAnyList={inAnyList}
                onAdd={(watchlistId) => onAdd(movie, watchlistId)}
                onRemove={(watchlistId) => onRemove(tmdbId, watchlistId)}
                onCreateAndAdd={onCreateAndAdd}
              />
            )}
          </div>
        </div>
      </div>

      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        title={title}
        youtubeKey={trailerKey}
        loading={trailerLoading}
        movie={movie}
        watchlists={watchlists}
        movieWatchlistIds={movieWatchlistIds}
        onAdd={onAdd}
        onRemove={onRemove}
        onCreateAndAdd={onCreateAndAdd}
      />

      {/* Info dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold">{title}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-6">
            {posterPath && (
              <img
                src={poster}
                alt={title}
                className="hidden sm:block w-[220px] shrink-0 self-start rounded"
              />
            )}
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex gap-1.5 items-center flex-wrap">
                {year && <span className="text-sm text-muted-foreground">{year}</span>}
                {director && year && <span className="text-sm text-muted-foreground">•</span>}
                {director && (
                  <button
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => { setInfoOpen(false); onDirectorClick?.(director) }}
                  >
                    {director.name}
                  </button>
                )}
              </div>
              {genreNames.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {genreNames.map((g) => (
                    <span key={g} className="border border-border rounded-[6px] px-2 py-[3px] text-xs text-muted-foreground">
                      {genreLabel(g)}
                    </span>
                  ))}
                </div>
              )}
              {synopsisLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner size="sm" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {synopsis || 'No synopsis available.'}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Remove from watchlist?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{title}" will be removed from this watchlist.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onRemove(tmdbId); setDeleteConfirmOpen(false) }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
