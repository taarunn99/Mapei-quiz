'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { RESPONDENT_KEY } from '../../lib/survey'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SurveyGate() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const boxes = useRef([])

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(RESPONDENT_KEY) || 'null')
      if (saved?.name) setName(saved.name)
      if (saved?.email) setEmail(saved.email)
    } catch {}
    router.prefetch('/survey/form')
  }, [router])

  function setDigit(i, v) {
    const digits = v.replace(/\D/g, '')
    if (digits.length > 1) { // paste
      const next = [...code]
      for (let k = 0; k < digits.length && i + k < 6; k++) next[i + k] = digits[k]
      setCode(next)
      boxes.current[Math.min(i + digits.length, 5)]?.focus()
      return
    }
    const next = [...code]; next[i] = digits; setCode(next)
    if (digits && i < 5) boxes.current[i + 1]?.focus()
  }

  function onKey(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) boxes.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus()
  }

  async function submit(e) {
    e.preventDefault()
    const n = name.trim().replace(/\s+/g, ' '), em = email.trim().toLowerCase(), pc = code.join('')
    if (n.length < 2) return setError('Please enter your full name.')
    if (!EMAIL_RE.test(em)) return setError('Please enter a valid email address.')
    if (pc.length !== 6) return setError('Please enter the 6-digit passcode from HR.')
    setError(''); setBusy(true)
    const { data, error: err } = await supabase.from('hr_settings').select('key').eq('key', 'passcode').eq('value', pc).maybeSingle()
    if (err) { setBusy(false); return setError('Could not reach the server. Please try again.') }
    if (!data) { setBusy(false); setCode(['', '', '', '', '', '']); boxes.current[0]?.focus(); return setError('That passcode is not correct. Please check with HR.') }
    sessionStorage.setItem(RESPONDENT_KEY, JSON.stringify({ name: n, email: em }))
    router.push('/survey/form')
  }

  return (
    <main className="hr-shell hr-fade">
      <div className="hr-brand"><span className="hr-brand-dot" aria-hidden="true" />LapizBlue · Human Resources</div>
      <div className="hr-card hr-accent">
        <h1 style={{ fontSize: 30, lineHeight: 1.15, marginBottom: 10 }}>Colleague Feedback Survey</h1>
        <p className="hr-sub">Ten short questions, rated 1 to 5. There are no right or wrong answers. It takes about two minutes.</p>
      </div>

      <form className="hr-card" onSubmit={submit} noValidate>
        <div className="hr-field">
          <label className="hr-label" htmlFor="hr-name">Your full name<span className="req" aria-hidden="true">*</span></label>
          <input id="hr-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sara Ahmed" required />
        </div>
        <div className="hr-field">
          <label className="hr-label" htmlFor="hr-email">Work email<span className="req" aria-hidden="true">*</span></label>
          <input id="hr-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@lapizblue.com" required />
        </div>
        <fieldset className="hr-field" style={{ border: 0, padding: 0, margin: '18px 0 0' }}>
          <legend className="hr-label">Passcode<span className="req" aria-hidden="true">*</span></legend>
          <div className="hr-otp">
            {code.map((d, i) => (
              <input key={i} ref={el => (boxes.current[i] = el)} value={d} inputMode="numeric" pattern="[0-9]*"
                autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? 6 : 1}
                aria-label={`Passcode digit ${i + 1} of 6`} aria-invalid={error.includes('passcode') ? 'true' : undefined}
                onChange={e => setDigit(i, e.target.value)} onKeyDown={e => onKey(i, e)} onFocus={e => e.target.select()} />
            ))}
          </div>
          <p className="hr-help">Ask HR for the 6-digit staff passcode.</p>
        </fieldset>
        {error && <div className="hr-error" role="alert">{error}</div>}
        <button className="hr-btn" type="submit" disabled={busy} style={{ marginTop: 22 }}>{busy ? 'Checking…' : 'Start survey'}</button>
      </form>
      <p className="hr-foot">Staff only · Responses are stored securely for HR KPI scoring</p>
    </main>
  )
}
