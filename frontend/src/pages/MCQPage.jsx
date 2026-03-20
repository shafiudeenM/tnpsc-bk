import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../lib/api.js'

const GROUPS = [
  { value:'all',    label:'All groups' },
  { value:'group1', label:'Group I' },
  { value:'group2', label:'Group II/IIA' },
  { value:'group4', label:'Group IV/VAO' },
]

function MCQQuiz({ mcqs, topic, examGroup, onDone }) {
  const [answers,   setAnswers]   = useState({})   // { idx: 'A' }
  const [submitted, setSubmitted] = useState(false)
  const [saving,    setSaving]    = useState(false)

  const choose = (idx, opt) => {
    if (submitted) return
    setAnswers(a => ({ ...a, [idx]: opt[0] }))   // opt[0] = 'A' / 'B' / ...
  }

  const score = () =>
    mcqs.filter((q, i) => answers[i] === q.answer).length

  const submit = async () => {
    setSubmitted(true)
    setSaving(true)
    try {
      await api.submitMCQ({ topic, examGroup, questions: mcqs, score: score() })
    } catch {}
    setSaving(false)
  }

  const optColor = (qIdx, opt) => {
    if (!submitted) return answers[qIdx] === opt[0] ? 'var(--saffron)' : 'var(--border)'
    if (opt[0] === mcqs[qIdx].answer) return 'var(--green)'
    if (answers[qIdx] === opt[0])     return '#dc2626'
    return 'var(--border)'
  }

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-head)', fontSize:'1.1rem', fontWeight:800,
        marginBottom:20, color:'var(--ink)' }}>
        {topic}
      </h2>

      {mcqs.map((q, qi) => (
        <div key={qi} style={{ marginBottom:24, padding:'18px 20px',
          background:'var(--card)', border:'1.5px solid var(--border)',
          borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow)' }}>
          <p style={{ fontWeight:500, marginBottom:14, fontSize:'.95rem' }}>
            {qi+1}. {q.question}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {q.options.map((opt, oi) => (
              <button key={oi} onClick={() => choose(qi, opt)} style={{
                textAlign:'left', padding:'9px 14px', borderRadius:8,
                border:`1.5px solid ${optColor(qi, opt)}`,
                background: submitted && opt[0] === q.answer ? '#f0fdf4'
                  : submitted && answers[qi] === opt[0] && opt[0] !== q.answer ? '#fef2f2'
                  : answers[qi] === opt[0] ? '#fff8f0' : 'var(--parchment)',
                cursor: submitted ? 'default' : 'pointer',
                fontSize:'.88rem', transition:'all .15s', fontFamily:'var(--font-body)',
              }}>
                {opt}
              </button>
            ))}
          </div>
          {submitted && (
            <div style={{ marginTop:10, padding:'8px 12px', background:'#f0fdf4',
              borderRadius:8, fontSize:'.8rem', color:'var(--green)' }}>
              ✓ {q.explanation}
            </div>
          )}
        </div>
      ))}

      {!submitted ? (
        <button onClick={submit}
          disabled={Object.keys(answers).length < mcqs.length}
          className="btn btn-primary">
          Submit answers ({Object.keys(answers).length}/{mcqs.length})
        </button>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
          <div style={{ padding:'12px 20px', background:'var(--card)',
            border:'1.5px solid var(--border)', borderRadius:'var(--radius-lg)',
            fontFamily:'var(--font-head)', fontWeight:800, fontSize:'1.1rem' }}>
            Score: {score()}/{mcqs.length}
            <span style={{ marginLeft:8, fontSize:'.85rem', color:'var(--ink-soft)', fontWeight:400 }}>
              {saving ? '(saving...)' : '(saved)'}
            </span>
          </div>
          <button onClick={onDone} className="btn btn-outline">Try another topic</button>
        </div>
      )}
    </div>
  )
}

export default function MCQPage() {
  const { lang } = useOutletContext()
  const [topic,     setTopic]     = useState('')
  const [examGroup, setExamGroup] = useState('all')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [mcqs,      setMcqs]      = useState(null)
  const [activeTopic, setActiveTopic] = useState('')

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true); setError(''); setMcqs(null)
    try {
      const res = await api.generateMCQ({ topic: topic.trim(), examGroup, lang })
      setMcqs(res.mcqs)
      setActiveTopic(topic.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (mcqs) return (
    <div style={{ maxWidth:720, margin:'0 auto', padding:'28px 24px 60px' }}>
      <MCQQuiz mcqs={mcqs} topic={activeTopic} examGroup={examGroup}
        onDone={() => { setMcqs(null); setTopic('') }} />
    </div>
  )

  return (
    <div style={{ maxWidth:560, margin:'0 auto', padding:'40px 24px 60px' }}>
      <h1 style={{ fontFamily:'var(--font-head)', fontSize:'1.4rem', fontWeight:800,
        marginBottom:6, letterSpacing:'-0.02em' }}>
        {lang === 'ta' ? 'MCQ பயிற்சி' : 'MCQ Practice'}
      </h1>
      <p style={{ color:'var(--ink-soft)', fontSize:'.88rem', marginBottom:28 }}>
        {lang === 'ta'
          ? 'ஒரு தலைப்பை தட்டச்சு செய்யுங்கள் — 5 கேள்விகள் உருவாக்கப்படும்'
          : 'Type any syllabus topic — 5 MCQs will be generated from the textbook'}
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label style={{ fontSize:'.78rem', fontWeight:600, color:'var(--ink-soft)',
            textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:5 }}>
            {lang === 'ta' ? 'தலைப்பு' : 'Topic'}
          </label>
          <input value={topic} onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder={lang === 'ta' ? 'எ.கா. மௌரிய பேரரசு' : 'e.g. Mauryan Empire, Western Ghats, 73rd Amendment'} />
        </div>

        <div>
          <label style={{ fontSize:'.78rem', fontWeight:600, color:'var(--ink-soft)',
            textTransform:'uppercase', letterSpacing:'.04em', display:'block', marginBottom:5 }}>
            {lang === 'ta' ? 'தேர்வு குழு' : 'Exam group'}
          </label>
          <select value={examGroup} onChange={e => setExamGroup(e.target.value)}>
            {GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        {error && (
          <div style={{ padding:'9px 12px', background:'#fef2f2',
            border:'1px solid #fecaca', borderRadius:8, fontSize:'.83rem', color:'#dc2626' }}>
            {error}
          </div>
        )}

        <button onClick={generate} disabled={!topic.trim() || loading}
          className="btn btn-primary" style={{ justifyContent:'center' }}>
          {loading
            ? <><span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,.3)',
                borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',
                display:'inline-block'}} /> {lang === 'ta' ? 'உருவாக்குகிறது...' : 'Generating...'}</>
            : lang === 'ta' ? '📝 கேள்விகள் உருவாக்கு' : '📝 Generate questions'}
        </button>
      </div>
    </div>
  )
}
