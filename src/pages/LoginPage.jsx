import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent } from '../components/ui/card'
import { Separator } from '../components/ui/separator'
import { Spinner } from '../components/ui/spinner'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error: authError } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else if (mode === 'signup') {
      setMessage('Account created! Check your email to confirm, then log in.')
      setMode('login')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Film className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">
              Kino<span style={{ color: '#E50914' }}>sõel</span>
            </span>
          </div>

          <h2 className="text-xl font-semibold mb-4">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/15 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-md bg-green-500/15 border border-green-500/30 px-3 py-2 text-sm text-green-400">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" className="mr-2" /> : null}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <Separator className="my-5" />

          <p className="text-sm text-muted-foreground text-center">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
