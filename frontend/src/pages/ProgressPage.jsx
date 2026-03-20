import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../lib/api.js'

const GROUPS = [
  { value:'all',    label:'All groups' },
  { value:'group1', label:'Group I' },
  { value:'group2', label:'Group II/IIA' },
  { value:'group4', label:'Group IV/VAO' },
]

function StatBox({ value, label, color }) {
  return (
    <div style={{ flex:1, padding:'16px 20px', background:'var(--card)',
      border:'1.5px solid var(--border)', borderRadius:'var(--radius-lg)',
      boxShadow:'var(--shadow)', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', fontWeight:800,
        color: color || 'var(--ink)', lineHeight:1 }}>
        {value}
      </div>
      <div style={{ fontSize:'.78rem', color:'var(--ink-soft)', marginTop:4 }}>{label}</div>
    </div>
  )
}

export default function ProgressPage() {
  const { lang } = useOutletContext()
  const [examGroup, setExamGroup] = useState('all')
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState('all')  // 'all' | 'seen' | 'unseen'

  useEffect(() => {
    setLoading(true)
    api.progress(examGroup)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [examGroup])

  const topics = data?.topics || []
  const stats  = data?.stats  || { total:0, seen:0, unseen:0, percent:0 }

  const filtered = topics.filter(t =>
    filter === 'all' ? true : filter === 'seen' ? t.seen : !t.seen
  )

  // Group by subject
  const bySubject = filtered.reduce((acc, t) => {
    if (!acc[t.subject]) acc[t.subject] = []
    acc[t.subject].push(t)
    return acc
  }, {})

  return (
    <div style={{ maxWidth:780, margin:'0 auto', padding:'28px 24px 60px' }}>
      <h1 style={{ fontFamily:'var(--font-head)', fontSize:'1.4rem', fontWeight:800,
        marginBottom:4, letterSpacing:'-0.02em' }}>
        {lang === 'ta' ? 'பாடத்திட்ட முன்னேற்றம்' : 'Syllabus Progress'}
      </h1>
      <p style={{ color:'var(--ink-soft)', fontSize:'.85rem', marginBottom:22 }}>
        {lang === 'ta'
          ? 'நீங்கள் கேட்ட தலைப்புகள் தானாக கண்காணிக்கப்படுகின்றன'
          : 'Topics are tracked automatically as you ask questions'}
      </p>

      {/* Group selector */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {GROUPS.map(g => (
          <button key={g.value} onClick={() => setExamGroup(g.value)} style={{
            padding:'5px 14px', borderRadius:20, border:'1.5px solid',
            borderColor: examGroup === g.value ? 'var(--saffron)' : 'var(--border)',
            background:  examGroup === g.value ? 'var(--saffron)' : 'var(--card)',
            color:       examGroup === g.value ? '#fff' : 'var(--ink-mid)',
            fontSize:'.78rem', fontWeight:600, cursor:'pointer', transition:'all .15s',
          }}>{g.label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ display:'flex', gap:12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex:1, height:80, background:'var(--border)',
              borderRadius:'var(--radius-lg)', animation:'pulse 1.3s ease infinite' }} />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Stats */}
          <div style={{ display:'flex', gap:12, marginBottom:24 }}>
            <StatBox value={`${stats.percent}%`} label="Coverage" color="var(--saffron)" />
            <StatBox value={stats.seen}    label="Topics seen"   color="var(--green)" />
            <StatBox value={stats.unseen}  label="Topics left"   color="var(--ink-soft)" />
          </div>

          {/* Progress bar */}
          <div style={{ height:8, background:'var(--border)', borderRadius:4, marginBottom:24, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${stats.percent}%`,
              background:'linear-gradient(90deg,var(--saffron-dk),var(--saffron))',
              borderRadius:4, transition:'width .5s ease' }} />
          </div>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:18 }}>
            {[['all','All'],['seen','Seen ✓'],['unseen','Not yet']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{
                padding:'5px 14px', borderRadius:20, border:'1.5px solid',
                borderColor: filter === v ? 'var(--saffron)' : 'var(--border)',
                background:  filter === v ? '#fff8f0' : 'var(--card)',
                color:       filter === v ? 'var(--saffron-dk)' : 'var(--ink-soft)',
                fontSize:'.78rem', fontWeight:600, cursor:'pointer',
              }}>{l}</button>
            ))}
          </div>

          {/* Topics grouped by subject */}
          {Object.entries(bySubject).length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 20px',
              color:'var(--ink-soft)', fontSize:'.9rem' }}>
              {filter === 'seen'
                ? "You haven't asked about any topics yet. Start by asking questions!"
                : "All topics covered! 🎉"}
            </div>
          )}

          {Object.entries(bySubject).map(([subject, topics]) => (
            <div key={subject} style={{ marginBottom:20 }}>
              <h3 style={{ fontFamily:'var(--font-head)', fontSize:'.85rem', fontWeight:700,
                color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'.06em',
                marginBottom:8 }}>
                {subject}
              </h3>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {topics.map((t, i) => (
                  <span key={i} style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    padding:'4px 12px', borderRadius:20, fontSize:'.78rem',
                    border:'1.5px solid',
                    borderColor: t.seen ? 'var(--green)' : 'var(--border)',
                    background:  t.seen ? '#f0fdf4' : 'var(--parchment)',
                    color:       t.seen ? 'var(--green)' : 'var(--ink-soft)',
                  }}>
                    {t.seen ? '✓' : '○'} {t.topic}
                    {t.last_seen && (
                      <span style={{ fontSize:'.68rem', opacity:.7 }}>
                        {new Date(t.last_seen).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {error && (
        <div style={{ padding:'10px 14px', background:'#fef2f2',
          border:'1px solid #fecaca', borderRadius:8, fontSize:'.85rem', color:'#dc2626' }}>
          {error}
        </div>
      )}
    </div>
  )
}
