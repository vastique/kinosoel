import { X } from 'lucide-react'
import WatchlistMenu from './WatchlistMenu'
import { Spinner } from './ui/spinner'

export default function TrailerModal({
  open, onClose, title, youtubeKey, loading,
  movie, watchlists, movieWatchlistIds, onAdd, onRemove, onCreateAndAdd,
}) {
  const inAnyList = movieWatchlistIds?.size > 0

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-[1400px] bg-[#0D0D0D] rounded-xl overflow-hidden"
        style={{ boxShadow: '0 0 100px rgba(229,9,20,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-base truncate flex-1 mr-2">{title}</span>
          <div className="flex items-center gap-1 shrink-0">
            <WatchlistMenu
              watchlists={watchlists ?? []}
              movieWatchlistIds={movieWatchlistIds}
              inAnyList={inAnyList}
              onAdd={(watchlistId) => onAdd(movie, watchlistId)}
              onRemove={(watchlistId) => onRemove(movie?.tmdbId, watchlistId)}
              onCreateAndAdd={onCreateAndAdd}
            />
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video area */}
        <div className="relative pt-[56.25%] bg-black">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </div>
          ) : youtubeKey ? (
            <iframe
              className="absolute inset-0 w-full h-full border-0"
              src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground">No trailer available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
