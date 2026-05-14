import { Navigate, useLocation } from 'react-router-dom'

const getStaffSession = () => {
  try {
    const raw = localStorage.getItem('staff_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function StaffRoute({ children }) {
  const location = useLocation()
  const session = getStaffSession()
  if (!session?.businessId) {
    const from = encodeURIComponent(location.pathname)
    return <Navigate to={`/staff/login?from=${from}`} replace />
  }
  return children
}
