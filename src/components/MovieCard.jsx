import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Box,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd'
import BookmarkRemoveIcon from '@mui/icons-material/BookmarkRemove'
import StarIcon from '@mui/icons-material/Star'
import { POSTER_BASE } from '../services/tmdb'

const RT_COLOR = (score) => {
  if (score === null || score === undefined) return '#888'
  if (score >= 60) return '#FA320A'
  return '#4CAF50'
}

export default function MovieCard({ movie, onAdd, onRemove, inWatchlist, loadingRt }) {
  const {
    tmdbId,
    title,
    year,
    posterPath,
    genreNames = [],
    tmdbRating,
    rtScore,
  } = movie

  const poster = posterPath
    ? `${POSTER_BASE}${posterPath}`
    : 'https://placehold.co/500x750/1a1a1a/888?text=No+Poster'

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        image={poster}
        alt={title}
        sx={{ height: 280, objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1, pb: 0 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap title={title}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {year || '—'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {genreNames.slice(0, 2).map((g) => (
            <Chip key={g} label={g} size="small" variant="outlined" sx={{ fontSize: 11 }} />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Tooltip title="TMDB Rating">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <StarIcon sx={{ color: '#F5C518', fontSize: 16 }} />
              <Typography variant="body2" fontWeight={600}>
                {tmdbRating ? tmdbRating.toFixed(1) : '—'}
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title="Rotten Tomatoes">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {loadingRt ? (
                <CircularProgress size={14} />
              ) : (
                <>
                  <Typography variant="body2" sx={{ fontSize: 14 }}>🍅</Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ color: RT_COLOR(rtScore) }}
                  >
                    {rtScore !== null && rtScore !== undefined ? `${rtScore}%` : '—'}
                  </Typography>
                </>
              )}
            </Box>
          </Tooltip>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        {inWatchlist ? (
          <Tooltip title="Remove from Watchlist">
            <IconButton color="primary" onClick={() => onRemove(tmdbId)}>
              <BookmarkRemoveIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Add to Watchlist">
            <IconButton color="primary" onClick={() => onAdd(movie)}>
              <BookmarkAddIcon />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  )
}
