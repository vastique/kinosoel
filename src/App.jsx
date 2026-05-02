import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, CssBaseline, Box } from '@mui/material'
import theme from './theme/theme'
import Navbar from './components/Navbar'
import SearchPage from './pages/SearchPage'
import WatchlistPage from './pages/WatchlistPage'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Navbar />
        <Box sx={{ minHeight: 'calc(100vh - 64px)', backgroundColor: 'background.default' }}>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
          </Routes>
        </Box>
      </HashRouter>
    </ThemeProvider>
  )
}
