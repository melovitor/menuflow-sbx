import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Spinner from '../components/ui/Spinner'

export default function OwnerRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}
