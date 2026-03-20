import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV = [
  { to: '/',         icon: '💬', label: 'Ask',      labelTa: 'கேள்' },
  { to: '/mcq',      icon: '📝', label: 'Practice', labelTa: 'பயிற்சி' },
  { to: '/progress', icon: '📊', label: 'Progress', labelTa: 'முன்னேற்றம்' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [lang, setLang] = useState('en')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)', flexShrink: 0,
        background: 'var(--card)',
        borderRight: '1.5px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{ padding: '22px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📚</span>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800,
                fontSize: '1rem', color: 'var(--saffron-dk)', letterSpacing: '-0.01em' }}>
                TNPSC Guru
              </div>
              <div style={{ fontSize: '.68rem', color: 'var(--ink-soft)' }}>
                Samacheer AI Tutor
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon, label, labelTa }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
              fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '.85rem',
              background: isActive ? 'var(--parchment)' : 'transparent',
              color: isActive ? 'var(--saffron-dk)' : 'var(--ink-mid)',
              borderLeft: isActive ? '3px solid var(--saffron)' : '3px solid transparent',
              transition: 'all .15s',
            })}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              {lang === 'ta' ? labelTa : label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom controls */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Lang toggle */}
          <button onClick={() => setLang(l => l === 'en' ? 'ta' : 'en')}
            style={{ background: 'var(--parchment)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-mid)',
              display: 'flex', alignItems: 'center', gap: 6 }}>
            🌐 {lang === 'en' ? 'தமிழ்' : 'English'}
          </button>

          {/* User + sign out */}
          <div style={{ fontSize: '.72rem', color: 'var(--ink-soft)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
          <button onClick={handleSignOut} className="btn btn-outline"
            style={{ fontSize: '.78rem', padding: '6px 10px', justifyContent: 'center' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Outlet context={{ lang }} />
      </main>
    </div>
  )
}
