import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function LoginPage() {
  const [mode,     setMode]     = useState('login')   // 'login' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [msg,      setMsg]      = useState('')
  const [loading,  setLoading]  = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError(''); setMsg('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg('Check your email to confirm your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // AuthContext listener will pick up the session automatically
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream)', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--card)', borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-lg)',
        padding: '36px 32px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📚</div>
          <h1 style={{
            fontFamily: 'var(--font-head)', fontSize: '1.6rem',
            fontWeight: 800, color: 'var(--saffron-dk)', letterSpacing: '-0.02em',
          }}>TNPSC Guru</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: '.85rem', marginTop: 4 }}>
            AI-powered Samacheer Kalvi tutor
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex', background: 'var(--parchment)',
          borderRadius: 10, padding: 3, marginBottom: 22,
        }}>
          {['login','signup'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '7px 0',
              background: mode === m ? 'var(--card)' : 'transparent',
              border: mode === m ? '1px solid var(--border)' : '1px solid transparent',
              borderRadius: 8, cursor: 'pointer',
              fontFamily: 'var(--font-head)', fontWeight: 700,
              fontSize: '.82rem',
              color: mode === m ? 'var(--saffron-dk)' : 'var(--ink-soft)',
              transition: 'all .15s',
            }}>
              {m === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-soft)',
              textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 5 }}>
              Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" required />
          </div>

          <div>
            <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-soft)',
              textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6} />
          </div>

          {error && (
            <div style={{ padding: '9px 12px', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 8,
              fontSize: '.83rem', color: '#dc2626' }}>
              {error}
            </div>
          )}
          {msg && (
            <div style={{ padding: '9px 12px', background: '#f0fdf4',
              border: '1px solid #bbf7d0', borderRadius: 8,
              fontSize: '.83rem', color: '#16a34a' }}>
              {msg}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading
              ? <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,.3)',
                  borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}} />
              : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
