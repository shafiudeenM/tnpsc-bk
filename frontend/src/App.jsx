import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Layout    from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AskPage   from './pages/AskPage.jsx'
import MCQPage   from './pages/MCQPage.jsx'
import ProgressPage from './pages/ProgressPage.jsx'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{
        width:32, height:32, border:'3px solid var(--border)',
        borderTopColor:'var(--saffron)', borderRadius:'50%',
        animation:'spin .7s linear infinite'
      }} />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index             element={<AskPage />} />
        <Route path="mcq"        element={<MCQPage />} />
        <Route path="progress"   element={<ProgressPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
