import { Bookmark, LogOut } from 'lucide-react'
import logo from '../assets/logo-kinosoel.svg'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[#0D0D0D]">
      <div className="flex h-[57px] items-center px-4">
        <div
          className="flex flex-1 cursor-pointer items-center gap-2"
          onClick={() => navigate('/', { state: { reset: Date.now() } })}
        >
          <img src={logo} alt="Kinosõel" className="h-7" />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={pathname === '/watchlist' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/watchlist')}
            className="gap-2"
          >
            <Bookmark className="h-4 w-4" />
            Watchlist
          </Button>

          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 text-muted-foreground hover:text-foreground ml-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign out ({user.email})</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  )
}
