import { useState } from 'react'
import {
  Card, CardMedia, Typography, IconButton, Box,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress,
} from '@mui/material'
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import rtIcon from '../assets/rt-icon.svg'
import tmdbIcon from '../assets/tmdb-icon.svg'
import { POSTER_BASE, getMovieTrailerKey, getMovieDetails } from '../services/tmdb'
import { genreLabel } from '../utils/genres'
import TrailerModal from './TrailerModal'
import WatchlistMenu from './WatchlistMenu'

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
  const [menuAnchor, setMenuAnchor] = useState(null)
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
      <Card
        onClick={handleTrailerClick}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          borderRadius: 0,
          '&:hover .overlay': { opacity: 1 },
        }}
      >
        <CardMedia
          component="img"
          image={poster}
          alt={title}
          draggable={false}
          sx={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block', userSelect: 'none' }}
        />

        <IconButton
          size="small"
          onClick={handleInfoClick}
          sx={{
            position: 'absolute', top: 8, right: 8,
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: '#fff',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>

        {/* Gradient overlay */}
        <Box
          className="overlay"
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 50%, transparent 100%)',
            p: '16px',
            pt: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Title + year + director */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Typography noWrap title={title} sx={{ fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1.3 }}>
              {title}
            </Typography>
            <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center', overflow: 'hidden' }}>
              <Typography sx={{ fontSize: 13, color: '#fff', fontWeight: 500, lineHeight: 1.3, flexShrink: 0 }}>
                {year || '—'}
              </Typography>
              {director && (
                <>
                  <Typography sx={{ fontSize: 13, color: '#fff', fontWeight: 500, flexShrink: 0 }}>•</Typography>
                  <Typography
                    noWrap
                    onClick={(e) => { e.stopPropagation(); onDirectorClick?.(director) }}
                    sx={{ fontSize: 13, color: '#fff', fontWeight: 500, lineHeight: 1.3, cursor: 'pointer', '&:hover': { color: 'primary.main' }, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {director.name}
                  </Typography>
                </>
              )}
            </Box>
          </Box>

          {/* Genre chips */}
          {genreNames.length > 0 && (
            <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {genreNames.slice(0, 2).map((g) => (
                <Box
                  key={g}
                  sx={{
                    border: '1px solid rgba(255,255,255,0.5)',
                    borderRadius: '6px',
                    px: '5px',
                    py: '3px',
                  }}
                >
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                    {genreLabel(g)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Ratings + bookmark */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {rtScore != null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Box component="img" src={rtIcon} alt="RT" sx={{ width: 20, height: 20, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 13, color: '#fff', fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                    {rtScore}%
                  </Typography>
                </Box>
              )}
              {tmdbRating > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Box component="img" src={tmdbIcon} alt="TMDB" sx={{ width: 20, height: 20, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 13, color: '#fff', fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                    {tmdbRating.toFixed(1)}
                  </Typography>
                </Box>
              )}
            </Box>

            {deleteMode ? (
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmOpen(true) }}
                sx={{ color: '#E50914', '&:hover': { color: '#ff4444' } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget) }}
                sx={inAnyList ? {
                  backgroundColor: '#E50914',
                  color: '#fff',
                  '&:hover': { backgroundColor: '#c0070f' },
                } : { color: '#fff' }}
              >
                <BookmarkAddIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </Card>

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

      <WatchlistMenu
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        watchlists={watchlists ?? []}
        movieWatchlistIds={movieWatchlistIds}
        onAdd={(watchlistId) => onAdd(movie, watchlistId)}
        onRemove={(watchlistId) => onRemove(tmdbId, watchlistId)}
        onCreateAndAdd={onCreateAndAdd}
      />

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2.5 }}>
            {/* Poster — desktop only */}
            {posterPath && (
              <Box
                component="img"
                src={poster}
                alt={title}
                sx={{ display: { xs: 'none', sm: 'block' }, width: 220, flexShrink: 0, alignSelf: 'flex-start', borderRadius: 1 }}
              />
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
              <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {year && <Typography variant="body2" color="text.secondary">{year}</Typography>}
                {director && year && <Typography variant="body2" color="text.secondary">•</Typography>}
                {director && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                    onClick={() => { setInfoOpen(false); onDirectorClick?.(director) }}
                  >
                    {director.name}
                  </Typography>
                )}
              </Box>
              {genreNames.length > 0 && (
                <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {genreNames.map((g) => (
                    <Box key={g} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '6px', px: '8px', py: '3px' }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{genreLabel(g)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {synopsisLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} color="primary" />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {synopsis || 'No synopsis available.'}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Remove from watchlist?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            "{title}" will be removed from this watchlist.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => { onRemove(tmdbId); setDeleteConfirmOpen(false) }}>Remove</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
