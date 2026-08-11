import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Diagnose from './pages/Diagnose.jsx'
import AddClass from './pages/AddClass.jsx'
import History from './pages/History.jsx'
import Profile from './pages/Profile.jsx'
import { useAuth } from './context/AuthContext.jsx'

function AppShell({ children }) {
  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px' }}>{children}</main>
    </div>
  )
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/diagnose" replace /> : <Login />} />
      <Route
        path="/diagnose"
        element={
          <ProtectedRoute>
            <AppShell>
              <Diagnose />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-class"
        element={
          <ProtectedRoute>
            <AppShell>
              <AddClass />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppShell>
              <History />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <Profile />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? '/diagnose' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/diagnose' : '/login'} replace />} />
    </Routes>
  )
}
