'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { SURVEYS, SCALE, periodFor, normaliseName, scoreOf, RESPONDENT_KEY } from '../../../lib/survey'

const EMPTY = Array(10).fill(0)

export default function SurveyForm() {
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [step, setStep] = useState('type') // type | who | questions | done
  const [type, setType] = useState(null)
  const [dept, setDept] = useState('')
  const [assessed, setAssessed] = useState('')
  const [answers, setAnswers] = useState(EMPTY)
  const [comment, setComment] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [known, setKnown] = useState({ names: [], depts: [] })
  const [result, setResult] = useState(null)

  useEffect(() => {
    let r = null
    try { r = JSON.parse(sessionStorage.getItem(RESPONDENT_KEY) || 'null') } catch {}
    if (!r?.email) { router.replace('/survey'); return }
    setMe(r)
    supabase.from('hr_responses').select('assessed_name, department').limit(2000).then(({ data }) => {
      const names = [...new Set((data || []).map(d => d.assessed_name).filter(Boolean))].sort()
      const depts = [...new Set((data || []).map(d => d.department).filter(Boolean))].sort()
      setKnown({ names, depts })
    })
  }, [router])

  useEffect(() => { window.scrollTo?.(0, 0); document.querySelector('.hr')?.scrollTo?.(0, 0) }, [step])

  const survey = type ? SURVEYS[type] : null
  const answered = answers.filter(Boolean).length

  function pick(t) { setType(t); setError(''); setStep('who') }

  function goQuestions(e) {
    e.preventDefault()
    const n = normaliseName(assessed)
    if (n.length < 2) return setError('Please enter the name of the person you are rating.')
    if (normaliseName(me.name) === n) return setError('This survey is for rating someone else, not yourself.')
    setAssessed(n); setDept(normaliseName(dept)); setError(''); setStep('questions')
  }

  function setAnswer(i, v) { setAnswers(a => { const n = [...a]; n[i] = v; return n }) }

  async function submit(e) {
    e.preventDefault()
    setTried(true)
    const missing = answers.findIndex(a => !a)
    if (missing !== -1) {
      setError(`Please answer all 10 questions. ${10 - answered} left.`)
      document.getElementById(`q-${missing}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setError(''); setBusy(true)
    const { total, kpi } = scoreOf(answers)
    const { error: err } = await supabase.from('hr_responses').insert([{
      survey_type: type, period: periodFor(), department: dept || null, assessed_name: assessed,
      respondent_name: me.name, respondent_email: me.email, answers, total, kpi_score: kpi,
      comment: comment.trim() || null,
    }])
    setBusy(false)
    if (err) {
      if (err.code === '23505') return setError(`You have already submitted this survey for ${assessed} this period.`)
      return setError('Could not save your answers. Please check your connection and try again.')
    }
    setResult({ total, kpi })
    setStep('done')
  }

  function another() {
    setType(null); setAssessed(''); setAnswers(EMPTY); setComment(''); setTried(false); setError(''); setResult(null); setStep('type')
  }

  const progress = useMemo(() => (answered / 10) * 100, [answered])
  if (!me) return null

  return (
    <main className="hr-shell">
      <div className="hr-brand" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="hr-brand-dot" aria-hidden="true" />Colleague Feedback</span>
        <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{me.name}</span>
      </div>

      {step === 'type' && (
        <section className="hr-fade" aria-labelledby="t-type">
          <div className="hr-card hr-accent">
            <h1 id="t-type" style={{ fontSize: 26, marginBottom: 8 }}>Who are you giving feedback to?</h1>
            <p className="hr-sub">Choose one. You can submit another survey afterwards.</p>
          </div>
          <div className="hr-card">
            {['A', 'B'].map(k => (
              <button key={k} type="button" className="hr-choice" onClick={() => pick(k)}>
                <span className="hr-choice-tag">Survey {k}</span>
                <div className="hr-choice-title">{SURVEYS[k].picker}</div>
                <div className="hr-help" style={{ marginTop: 4 }}>{SURVEYS[k].blurb}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'who' && survey && (
        <form className="hr-fade" onSubmit={goQuestions} noValidate>
          <button type="button" className="hr-back" onClick={() => setStep('type')}>&larr; Back</button>
          <div className="hr-card hr-accent">
            <span className="hr-choice-tag">Survey {type} · {survey.title}</span>
            <h1 style={{ fontSize: 26, marginTop: 4 }}>Who are you rating?</h1>
          </div>
          <div className="hr-card">
            <div className="hr-field">
              <label className="hr-label" htmlFor="assessed">{survey.assessedLabel}<span className="req" aria-hidden="true">*</span></label>
              <input id="assessed" list="known-names" autoComplete="off" value={assessed} onChange={e => setAssessed(e.target.value)} placeholder="Start typing a name" autoFocus />
              <datalist id="known-names">{known.names.map(n => <option key={n} value={n} />)}</datalist>
              <p className="hr-help">Pick from the list if the name appears, so all feedback for one person stays together.</p>
            </div>
            <div className="hr-field">
              <label className="hr-label" htmlFor="dept">Department <span style={{ fontWeight: 400, color: 'var(--hr-muted)' }}>(optional)</span></label>
              <input id="dept" list="known-depts" autoComplete="off" value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. Sales, Warehouse, Accounts" />
              <datalist id="known-depts">{known.depts.map(n => <option key={n} value={n} />)}</datalist>
            </div>
            {error && <div className="hr-error" role="alert">{error}</div>}
            <button className="hr-btn" type="submit" style={{ marginTop: 22 }}>Continue</button>
          </div>
        </form>
      )}

      {step === 'questions' && survey && (
        <form className="hr-fade" onSubmit={submit} noValidate>
          <button type="button" className="hr-back" onClick={() => setStep('who')}>&larr; Back</button>
          <div className="hr-progress" aria-hidden="true">
            <div className="hr-progress-row"><span>Rating <strong style={{ color: 'var(--hr-ink)' }}>{assessed}</strong></span><span>{answered} / 10</span></div>
            <div className="hr-progress-bar"><div className="hr-progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="hr-card">
            <p className="hr-help" style={{ marginTop: 0, marginBottom: 14 }}>1 = Very Poor · 2 = Poor · 3 = Satisfactory · 4 = Good · 5 = Excellent</p>
            {survey.questions.map((q, i) => (
              <div key={i} id={`q-${i}`} className={`hr-q ${tried && !answers[i] ? 'hr-q-missing' : ''}`}>
                <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <legend className="hr-q-text"><span className="hr-q-num" aria-hidden="true">{i + 1}</span><span>{q}</span></legend>
                  <div className="hr-scale">
                    {SCALE.map(s => (
                      <label key={s.value} className="hr-rate">
                        <input type="radio" name={`q${i}`} value={s.value} checked={answers[i] === s.value}
                          onChange={() => setAnswer(i, s.value)} aria-label={`${s.value}, ${s.label}`} />
                        <span aria-hidden="true"><b>{s.value}</b><small>{s.short || s.label}</small></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            ))}
          </div>
          <div className="hr-card">
            <label className="hr-label" htmlFor="comment">Any other comments? <span style={{ fontWeight: 400, color: 'var(--hr-muted)' }}>(optional, not scored)</span></label>
            <textarea id="comment" rows={4} maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} placeholder="Anything you'd like HR to know" />
            {error && <div className="hr-error" role="alert">{error}</div>}
            <button className="hr-btn" type="submit" disabled={busy} style={{ marginTop: 18 }}>{busy ? 'Submitting…' : 'Submit feedback'}</button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <section className="hr-card hr-fade" style={{ textAlign: 'center', padding: '36px 24px' }} aria-live="polite">
          <div className="hr-done-icon" aria-hidden="true">✓</div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Thank you, {me.name.split(' ')[0]}</h1>
          <p className="hr-sub" style={{ marginBottom: 6 }}>Your feedback for <strong style={{ color: 'var(--hr-ink)' }}>{assessed}</strong> has been recorded.</p>
          {type === 'A'
            ? <p className="hr-help">Your individual answers are not shown to your manager.</p>
            : result && <p className="hr-help">Total {result.total} / 50 · KPI score {result.kpi} / 100</p>}
          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            <button className="hr-btn" type="button" onClick={another}>Give feedback on someone else</button>
            <button className="hr-btn hr-btn-ghost" type="button" onClick={() => { sessionStorage.removeItem(RESPONDENT_KEY); router.push('/survey') }}>Finish</button>
          </div>
        </section>
      )}
    </main>
  )
}
