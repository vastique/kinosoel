import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './ui/spinner'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <Spinner />
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
