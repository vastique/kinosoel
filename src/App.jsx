import { HashRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import SearchPage from './pages/SearchPage'
import WatchlistPage from './pages/WatchlistPage'
import LoginPage from './pages/LoginPage'
import { TooltipProvider } from './components/ui/tooltip'

export default function App() {
  return (
    <TooltipProvider>
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="min-h-[calc(100vh-57px)]">
                    <Routes>
                      <Route path="/" element={<SearchPage />} />
                      <Route path="/watchlist" element={<WatchlistPage />} />
                    </Routes>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </HashRouter>
      <Toaster position="bottom-center" theme="dark" richColors />
    </TooltipProvider>
  )
}
