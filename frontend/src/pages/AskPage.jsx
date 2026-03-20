import React, { useState, useRef, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../lib/api.js'

const GROUPS = [
  { value: 'all',    en: 'All groups',   ta: 'அனைத்தும்' },
  { value: 'group1', en: 'Group I',      ta: 'குழு I' },
  { value: 'group2', en: 'Group II/IIA', ta: 'குழு II' },
  { value: 'group4', en: 'Group IV/VAO', ta: 'குழு IV' },
]

const EXAMPLES = {
  en: [
    'What is the 73rd Constitutional Amendment?',
    'Explain the Quit India Movement',
    'What are the functions of Panchayati Raj?',
    'Describe the Western Ghats ecosystem',
  ],
  ta: [
    '73வது அரசியலமைப்பு திருத்தம் என்ன?',
    'வெள்ளையனே வெளியேறு இயக்கம் விவரி',
    'பஞ்சாயத்து ராஜ் செயல்பாடுகள் என்ன?',
  ],
}

const LANG_BADGE = { en: '🇬🇧 English', ta: '🇮🇳 Tamil', tanglish: '💬 Tanglish' }

function SourcePill({ s }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: 'var(--parchment)', border: '1px solid var(--border)',
      fontSize: '.73rem', color: 'var(--ink-mid)',
    }}>
      📖 Class {s.class} · {s.subject} · Pg {s.page}
      {s.score ? <span style={{ color: 'var(--saffron)', fontWeight: 600 }}> {s.score}%</span> : null}
    </span>
  )
}

function AnswerCard({ item }) {
  const [showSrc, setShowSrc] = useState(false)
  const [copied,  setCopied]  = useState(false)

  return (
    <div className="fade-up" style={{
      background: 'var(--card)', border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', overflow: 'hidden',
      marginBottom: 20,
    }}>
      {/* Question bar */}
      <div style={{
        padding: '12px 18px',
        background: 'linear-gradient(135deg,var(--saffron-dk),var(--saffron))',
        color: '#fff', fontSize: '.88rem', display: 'flex', gap: 10,
      }}>
        <span style={{ opacity: .7, flexShrink: 0 }}>Q.</span>
        <span style={{ flex: 1 }}>{item.question}</span>
        <span style={{
          background: 'rgba(255,255,255,.2)', padding: '1px 8px',
          borderRadius: 10, fontSize: '.7rem', whiteSpace: 'nowrap', alignSelf: 'flex-start',
        }}>{LANG_BADGE[item.detectedLang] || ''}</span>
      </div>

      {/* Answer */}
      <div style={{ padding: '18px 22px' }}>
        <div className={`answer-body ${item.replyLang === 'ta' ? 'tamil' : ''}`}
          style={{ fontSize: item.replyLang === 'ta' ? '1rem' : '.94rem',
            lineHeight: item.replyLang === 'ta' ? 1.9 : 1.7 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 12,
          borderTop: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setShowSrc(s => !s)} className="btn btn-outline"
            style={{ fontSize: '.75rem', padding: '5px 12px' }}>
            📖 Sources ({item.sources?.length || 0}) {showSrc ? '▲' : '▼'}
          </button>
          <button onClick={() => {
            navigator.clipboard.writeText(item.answer)
            setCopied(true); setTimeout(() => setCopied(false), 2000)
          }} className="btn btn-outline" style={{ fontSize: '.75rem', padding: '5px 12px',
            ...(copied ? { background:'var(--green)', color:'#fff', borderColor:'var(--green)' } : {}) }}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        {showSrc && item.sources?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {item.sources.map((s, i) => <SourcePill key={i} s={s} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AskPage() {
  const { lang } = useOutletContext()
  const [question,   setQuestion]   = useState('')
  const [examGroup,  setExamGroup]  = useState('all')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [history,    setHistory]    = useState([])
  const answerRef = useRef(null)
  const taRef     = useRef(null)

  const t = {
    placeholder: lang === 'ta'
      ? 'ஆங்கிலம், தமிழ் அல்லது Tanglish-ல் கேளுங்கள்...'
      : 'Ask in English, Tamil or Tanglish...',
    ask:     lang === 'ta' ? 'கேள்'       : 'Ask',
    asking:  lang === 'ta' ? 'தேடுகிறது...' : 'Searching...',
    try:     lang === 'ta' ? 'முயற்சிக்கவும்:' : 'Try asking:',
  }

  const submit = async () => {
    if (!question.trim() || loading) return
    setLoading(true); setError('')
    try {
      const res = await api.ask({ question: question.trim(), examGroup, preferMedium: lang === 'ta' ? 'ta' : 'en' })
      setHistory(prev => [{ question: question.trim(), ...res }, ...prev])
      setQuestion('')
      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 24px 60px', width: '100%' }}>
      {/* Group filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {GROUPS.map(g => (
          <button key={g.value} onClick={() => setExamGroup(g.value)} style={{
            padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
            borderColor: examGroup === g.value ? 'var(--saffron)' : 'var(--border)',
            background: examGroup === g.value ? 'var(--saffron)' : 'var(--card)',
            color: examGroup === g.value ? '#fff' : 'var(--ink-mid)',
            fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
            fontFamily: lang === 'ta' ? 'var(--font-tamil)' : 'var(--font-head)',
          }}>
            {lang === 'ta' ? g.ta : g.en}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div style={{
        background: 'var(--card)', border: '2px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '4px 4px 4px 16px',
        boxShadow: 'var(--shadow)', display: 'flex', gap: 8,
        transition: 'border-color .2s',
      }}
        onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--saffron)'}
        onBlurCapture={e  => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <textarea ref={taRef} rows={2} value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }}}
          placeholder={t.placeholder}
          style={{
            flex: 1, border: 'none', outline: 'none', resize: 'none',
            fontSize: '1rem', lineHeight: 1.6, background: 'transparent',
            paddingTop: 10, paddingBottom: 6, color: 'var(--ink)',
            fontFamily: lang === 'ta' ? 'var(--font-tamil)' : 'var(--font-body)',
          }}
        />
        <button onClick={submit} disabled={!question.trim() || loading}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-end', marginBottom: 6, minWidth: 80 }}>
          {loading
            ? <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.3)',
                borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}} />
            : t.ask}
        </button>
      </div>

      {/* Example pills */}
      <div style={{ marginTop: 12 }}>
        <span style={{ fontSize: '.72rem', color: 'var(--ink-soft)', marginRight: 6 }}>{t.try}</span>
        {(EXAMPLES[lang] || EXAMPLES.en).map((ex, i) => (
          <button key={i} onClick={() => { setQuestion(ex); taRef.current?.focus() }}
            style={{
              display: 'inline-block', margin: '0 4px 4px 0',
              background: 'var(--parchment)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '3px 11px', fontSize: '.73rem',
              color: 'var(--ink-mid)', cursor: 'pointer', transition: 'all .15s',
              fontFamily: lang === 'ta' ? 'var(--font-tamil)' : 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--saffron)'; e.currentTarget.style.color='#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--parchment)'; e.currentTarget.style.color='var(--ink-mid)' }}
          >{ex}</button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8, fontSize: '.85rem', color: '#dc2626' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ marginTop: 20, background: 'var(--card)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 24, animation: 'pulse 1.3s ease infinite' }}>
          {[100,82,90,55].map((w,i) => (
            <div key={i} style={{ height:13, background:'var(--border)', borderRadius:6,
              width:`${w}%`, marginBottom:12 }} />
          ))}
        </div>
      )}

      {/* Answers */}
      <div ref={answerRef} style={{ marginTop: 20 }}>
        {history.map((item, i) => <AnswerCard key={i} item={item} />)}
      </div>
    </div>
  )
}
