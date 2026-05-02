import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'
import MovieIcon from '@mui/icons-material/Movie'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import SearchIcon from '@mui/icons-material/Search'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <AppBar position="sticky" sx={{ backgroundColor: '#0D0D0D', borderBottom: '1px solid #2a2a2a' }}>
      <Toolbar>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flexGrow: 1 }}
          onClick={() => navigate('/')}
        >
          <MovieIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h6" sx={{ color: 'white', letterSpacing: '-0.5px' }}>
            Movie<span style={{ color: '#E50914' }}>Fav</span>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<SearchIcon />}
            onClick={() => navigate('/')}
            variant={pathname === '/' ? 'contained' : 'text'}
            color="primary"
          >
            Search
          </Button>
          <Button
            startIcon={<BookmarkIcon />}
            onClick={() => navigate('/watchlist')}
            variant={pathname === '/watchlist' ? 'contained' : 'text'}
            color="primary"
          >
            Watchlist
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
