'use client'
import { useEffect, useMemo, useState, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { SURVEYS, periodFor, periodLabel, MIN_HOD_RESPONSES } from '../lib/survey'

const label = { fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }
const kpiColor = k => (k >= 80 ? '#4ade80' : k >= 60 ? '#fbbf24' : '#ff6b6b')
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

function download(name, rows) {
  const blob = new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export default function HrAdmin({ notify }) {
  const [view, setView] = useState('report')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(periodFor())
  const [type, setType] = useState('A')
  const [dept, setDept] = useState('All')
  const [open, setOpen] = useState(null)
  const [passcode, setPasscode] = useState('')
  const [newCode, setNewCode] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data }, { data: s }] = await Promise.all([
      supabase.from('hr_responses').select('*').order('created_at', { ascending: false }).limit(5000),
      supabase.from('hr_settings').select('value').eq('key', 'passcode').maybeSingle(),
    ])
    setRows(data || []); setPasscode(s?.value || ''); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const periods = useMemo(() => [...new Set([periodFor(), ...rows.map(r => r.period)])].sort().reverse(), [rows])
  const depts = useMemo(() => ['All', ...new Set(rows.map(r => r.department).filter(Boolean))], [rows])
  const filtered = useMemo(() => rows.filter(r => r.period === period && r.survey_type === type && (dept === 'All' || r.department === dept)), [rows, period, type, dept])

  const groups = useMemo(() => {
    const m = new Map()
    for (const r of filtered) {
      const k = r.assessed_name.toLowerCase()
      if (!m.has(k)) m.set(k, { name: r.assessed_name, depts: new Set(), list: [] })
      const g = m.get(k); g.list.push(r); if (r.department) g.depts.add(r.department)
    }
    return [...m.values()].map(g => ({
      ...g,
      dept: [...g.depts].join(', '),
      kpi: Math.round(avg(g.list.map(r => r.kpi_score))),
      perQ: Array.from({ length: 10 }, (_, i) => avg(g.list.map(r => r.answers[i]))),
    })).sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  function exportCsv() {
    const qs = SURVEYS[type].questions.map((_, i) => `Q${i + 1} avg`)
    const out = [['Period', 'Survey', 'Person assessed', 'Department', 'Responses', 'KPI score /100', ...qs, ...(type === 'B' ? ['Rated by'] : [])]]
    for (const g of groups) out.push([periodLabel(period), type, g.name, g.dept, g.list.length, g.kpi, ...g.perQ.map(v => v.toFixed(2)), ...(type === 'B' ? [g.list.map(r => r.respondent_name).join('; ')] : [])])
    download(`hr-survey-${type}-${period}.csv`, out)
  }

  function exportCompletions() {
    const out = [['Date', 'Period', 'Survey', 'Respondent', 'Email', 'Person assessed', 'Department']]
    for (const r of rows.filter(r => r.period === period)) out.push([new Date(r.created_at).toLocaleString(), r.period, r.survey_type, r.respondent_name, r.respondent_email, r.assessed_name, r.department || ''])
    download(`hr-survey-completions-${period}.csv`, out)
  }

  async function savePasscode() {
    if (!/^\d{6}$/.test(newCode)) return notify('Passcode must be exactly 6 digits', 'error')
    const { error } = await supabase.from('hr_settings').upsert({ key: 'passcode', value: newCode })
    if (error) return notify('Could not save passcode: ' + error.message, 'error')
    setPasscode(newCode); setNewCode(''); notify('Passcode updated. Share the new one with staff.')
  }

  async function del(id) {
    const { error } = await supabase.from('hr_responses').delete().eq('id', id)
    if (error) return notify('Delete failed: ' + error.message, 'error')
    setRows(r => r.filter(x => x.id !== id)); setConfirmDel(null); notify('Response deleted')
  }

  const surveyUrl = typeof window !== 'undefined' ? `${window.location.origin}/survey` : '/survey'

  return (
    <div className="animate-fade">
      <div className="tabs" style={{ marginBottom: 14 }}>
        {[['report', 'KPI Report'], ['completions', 'Completions'], ['settings', 'Settings']].map(([k, l]) => (
          <button key={k} className={`tab ${view === k ? 'tab-active' : 'tab-inactive'}`} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>

      {loading ? <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /><span>Loading survey data…</span></div> : (<>

      {view !== 'settings' && (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14, padding: 16 }}>
          <div><label style={label} htmlFor="hr-period">Period</label>
            <select id="hr-period" value={period} onChange={e => setPeriod(e.target.value)}>{periods.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}</select></div>
          {view === 'report' && <>
            <div><label style={label} htmlFor="hr-type">Survey</label>
              <select id="hr-type" value={type} onChange={e => { setType(e.target.value); setOpen(null) }}>
                <option value="A">A · Staff rating HOD (anonymous)</option><option value="B">B · HOD rating staff</option></select></div>
            <div><label style={label} htmlFor="hr-dept">Department</label>
              <select id="hr-dept" value={dept} onChange={e => setDept(e.target.value)}>{depts.map(d => <option key={d}>{d}</option>)}</select></div>
          </>}
        </div>
      )}

      {view === 'report' && (
        groups.length === 0 ? (
          <div className="card empty"><div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>No Survey {type} responses for {periodLabel(period)} yet.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 18, fontWeight: 700 }}>Colleague Feedback KPI · {groups.length} {groups.length === 1 ? 'person' : 'people'}</div>
              <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={exportCsv}>Export CSV</button>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Person</th><th>Dept</th><th>Responses</th><th>KPI /100</th>{SURVEYS[type].questions.map((q, i) => <th key={i} title={q} style={{ textAlign: 'center' }}>Q{i + 1}</th>)}<th /></tr></thead>
                <tbody>
                  {groups.map(g => (
                    <Fragment key={g.name}>
                      <tr>
                        <td style={{ fontWeight: 600 }}>{g.name}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>{g.dept || '—'}</td>
                        <td>{g.list.length}{type === 'A' && g.list.length < MIN_HOD_RESPONSES && <span className="badge badge-red" style={{ marginLeft: 6, fontSize: 10 }} title={`HR prefers at least ${MIN_HOD_RESPONSES} staff responses`}>below {MIN_HOD_RESPONSES}</span>}</td>
                        <td><span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 800, fontSize: 20, color: kpiColor(g.kpi) }}>{g.kpi}</span></td>
                        {g.perQ.map((v, i) => <td key={i} style={{ textAlign: 'center', fontSize: 13, color: v < 3 ? '#ff8a8a' : 'var(--text)' }}>{v.toFixed(1)}</td>)}
                        <td><button className="btn btn-ghost btn-sm" style={{ width: 'auto', minHeight: 36, padding: '6px 12px' }} aria-expanded={open === g.name} onClick={() => setOpen(open === g.name ? null : g.name)}>{open === g.name ? 'Hide' : 'Details'}</button></td>
                      </tr>
                      {open === g.name && (
                        <tr><td colSpan={15} style={{ background: 'rgba(255,255,255,0.03)', padding: 16 }}>
                          {type === 'B' && <div style={{ fontSize: 13, marginBottom: 10 }}><span style={{ color: 'var(--muted)' }}>Rated by:</span> {g.list.map(r => `${r.respondent_name} (${r.kpi_score})`).join(', ')}</div>}
                          {type === 'A' && <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--muted)' }}>Individual KPI scores: {g.list.map(r => r.kpi_score).sort((a, b) => b - a).join(', ')} · respondent names are hidden for anonymity</div>}
                          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: '8px 0 6px' }}>Comments</div>
                          {g.list.filter(r => r.comment).length === 0 ? <div style={{ fontSize: 13, color: 'var(--muted)' }}>No comments.</div> :
                            g.list.filter(r => r.comment).map(r => <div key={r.id} style={{ fontSize: 14, lineHeight: 1.5, padding: '8px 12px', borderLeft: '3px solid #a78bfa', background: 'rgba(167,139,250,0.06)', borderRadius: 6, marginBottom: 6 }}>{r.comment}{type === 'B' && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>— {r.respondent_name}</div>}</div>)}
                        </td></tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {view === 'completions' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 18, fontWeight: 700 }}>Who has submitted · {rows.filter(r => r.period === period).length}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Admin only. Do not share Survey A rows with the managers being rated.</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={exportCompletions}>Export CSV</button>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Date</th><th>Respondent</th><th>Survey</th><th>Rated</th><th /></tr></thead>
              <tbody>
                {rows.filter(r => r.period === period).map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td><div style={{ fontWeight: 600 }}>{r.respondent_name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.respondent_email}</div></td>
                    <td><span className={`badge ${r.survey_type === 'A' ? 'badge-blue' : 'badge-yellow'}`}>{r.survey_type}</span></td>
                    <td>{r.assessed_name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {confirmDel === r.id ? (<>
                        <button className="btn btn-sm" style={{ width: 'auto', minHeight: 36, padding: '6px 10px', background: 'rgba(227,6,19,0.2)', color: '#ff8a8a', border: '1px solid rgba(227,6,19,0.4)', marginRight: 6 }} onClick={() => del(r.id)}>Confirm</button>
                        <button className="btn btn-ghost btn-sm" style={{ width: 'auto', minHeight: 36, padding: '6px 10px' }} onClick={() => setConfirmDel(null)}>Cancel</button>
                      </>) : <button className="btn btn-ghost btn-sm" style={{ width: 'auto', minHeight: 36, padding: '6px 10px' }} onClick={() => setConfirmDel(r.id)} aria-label={`Delete response from ${r.respondent_name}`}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Staff passcode</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Everyone uses this 6-digit code to open the survey. Change it to cut off access.</div>
            <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 36, fontWeight: 800, letterSpacing: 8, marginBottom: 14 }}>{passcode || '— not set —'}</div>
            <label style={label} htmlFor="new-code">New passcode</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input id="new-code" inputMode="numeric" maxLength={6} value={newCode} onChange={e => setNewCode(e.target.value.replace(/\D/g, ''))} placeholder="6 digits" style={{ letterSpacing: 4 }} />
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={savePasscode}>Save</button>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginTop: 10 }} onClick={() => setNewCode(String(Math.floor(100000 + Math.random() * 900000)))}>Generate random</button>
          </div>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Survey link</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>Send this link plus the passcode to staff.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input readOnly value={surveyUrl} aria-label="Survey link" onFocus={e => e.target.select()} />
              <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => navigator.clipboard?.writeText(surveyUrl).then(() => notify('Link copied'), () => notify('Copy failed, select the link manually', 'error'))}>Copy</button>
            </div>
          </div>
          <div className="card" style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>Scoring.</strong> 10 questions × 5 = 50 points. KPI score = total × 2, out of 100.
            Where several people rate the same person, the KPI is the average of their scores. Survey A flags anyone with fewer than {MIN_HOD_RESPONSES} responses.
            Periods run Jan–Jun and Jul–Dec. Each person can rate the same colleague once per period.
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}
