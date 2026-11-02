'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '../components/Toast'



const INPUT_STYLE = { background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.08)', color: '#fff', padding: '14px 16px', borderRadius: 12, fontSize: 15, width: '100%', fontFamily: 'var(--font-inter),sans-serif', transition: 'all 0.3s', outline: 'none' }
const INPUT_ICON_STYLE = { background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.08)', color: '#fff', padding: '14px 16px 14px 44px', borderRadius: 12, fontSize: 15, width: '100%', fontFamily: 'var(--font-inter),sans-serif', transition: 'all 0.3s', outline: 'none' }

export default function Home() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)
  const [regEmail, setRegEmail] = useState('')
  const [loginError, setLoginError] = useState('')
  const router = useRouter()

  function showToast(message, type = 'error') { setToast({ message, type }) }

  async function handleLogin() {
    if (!username || !password) { setLoginError('Please enter username and password'); showToast('Please enter username and password'); return }
    setLoginError(''); setLoading(true)
    const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('password', password).single()
    if (error || !data) {
      setLoginError('Invalid username or password'); showToast('Invalid username or password')
    } else if (data.status === 'pending') {
      setLoginError('Your account is pending admin approval.'); showToast('Your account is pending admin approval. Check your email for updates.')
    } else if (data.status === 'rejected') {
      setLoginError('Your account was not approved. Contact adil@lapizblue.com'); showToast('Your account was not approved. Contact adil@lapizblue.com')
    } else {
      localStorage.setItem('user', JSON.stringify(data))
      if (data.role === 'admin') router.push('/admin')
      else if (!data.avatar || data.avatar === 0) router.push('/avatar')
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  async function handleRegister() {
    if (!firstName || !lastName || !email || !username || !password || !confirmPassword) { showToast('Please fill in all fields'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email address'); return }
    if (password.length < 6) { showToast('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { showToast('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.from('users').insert([{
      first_name: firstName, last_name: lastName, email, username, password, role: 'user', status: 'pending'
    }])
    if (error) {
      showToast(error.message.includes('duplicate') || error.message.includes('unique') ? 'Username already exists' : 'Registration failed. Try again.')
    } else {
      // Send notification email to admin
      try { await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'new_registration', data: { first_name: firstName, last_name: lastName, email, username } }) }) } catch (e) {}
      setRegEmail(email)
      setRegSuccess(true)
    }
    setLoading(false)
  }

  // Background elements shared by all views
  const bg = (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse at 50% 110%, rgba(227,6,19,0.10) 0%, transparent 60%)', pointerEvents: 'none' }} />
  )

  const footer = (
    <div style={{ marginTop: 40, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, position: 'relative', zIndex: 2, lineHeight: 1.8 }}>
      Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026
      <br /><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>v1.1&nbsp;&nbsp;|&nbsp;&nbsp;Internal Use Only</span>
      <br /><Link href="/survey" className="hr-link">HR Colleague Feedback Survey &rarr;</Link>
    </div>
  )

  // Registration success screen
  if (regSuccess) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {bg}
      <div className="login-card-anim" style={{ width: '100%', maxWidth: 440, background: 'rgba(255,255,255,0.07)', borderRadius: 22, padding: 40, border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 40px rgba(0,0,0,0.35)', position: 'relative', zIndex: 2, borderTop: '3px solid #22c55e', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 12 }}>Request Submitted!</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          You will receive an email at <strong style={{ color: 'white' }}>{regEmail}</strong> once your account is approved by the admin.
        </p>
        <button onClick={() => { setRegSuccess(false); setMode('login'); setUsername(''); setPassword(''); setFirstName(''); setLastName(''); setEmail(''); setConfirmPassword('') }}
          style={{ width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none', background: '#E30613', color: 'white', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-inter),sans-serif', cursor: 'pointer', boxShadow: '0 4px 24px rgba(227,6,19,0.4)', minHeight: 52 }}>
          Back to Login
        </button>
      </div>
      {footer}
      <style jsx>{`
        @keyframes loginSlideUp { from { opacity:0;transform:translateY(30px); } to { opacity:1;transform:translateY(0); } }
        .login-card-anim { animation: loginSlideUp 0.3s ease 0.05s both; }
      `}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: mode === 'register' ? 'flex-start' : 'center', padding: 24, paddingTop: mode === 'register' ? 40 : 24, position: 'relative', overflow: 'hidden' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {bg}

      {/* Logo */}
      <div className="login-logo-anim" style={{ textAlign: 'center', marginBottom: mode === 'register' ? 20 : 36, position: 'relative', zIndex: 2 }}>
        <img src="/lapizblue-logo.webp" alt="Lapiz Blue General Trading" width={440} height={109} style={{ height: mode === 'register' ? 70 : 110, width: 'auto', maxWidth: '100%', objectFit: 'contain', filter: 'brightness(1.8) contrast(0.9)' }} />
      </div>

      {/* Title - only on login */}
      {mode === 'login' && (
        <>
          <div className="login-logo-anim" style={{ textAlign: 'center', marginBottom: 10, position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: 8, textTransform: 'uppercase', fontFamily: 'var(--font-rajdhani),sans-serif' }}>Staff Training Quiz</div>
            <div style={{ width: 50, height: 3, background: '#E30613', margin: '12px auto', borderRadius: 2 }} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 400, letterSpacing: 1.5 }}>Mapei Product Knowledge Assessment</div>
          </div>
          <div className="login-card-anim" style={{ display: 'flex', gap: 12, marginTop: 24, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
            {['100+ Questions', '4 Levels', 'Certified Training'].map(chip => (
              <div key={chip} className="stat-chip" style={{ padding: '9px 22px', borderRadius: 22, border: '1px solid rgba(227,6,19,0.3)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, letterSpacing: 0.5, background: 'rgba(227,6,19,0.08)', boxShadow: '0 0 12px rgba(227,6,19,0.1)', transition: 'all 0.3s', cursor: 'default' }}>{chip}</div>
            ))}
          </div>
        </>
      )}

      {/* Card */}
      <div className="login-card-anim" style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(255,255,255,0.07)',
        borderRadius: 22, padding: mode === 'register' ? 30 : 36,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.35), 0 0 60px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.08)',
        position: 'relative', zIndex: 2, borderTop: '3px solid #E30613',
      }}>
        <h2 style={{ marginBottom: mode === 'register' ? 20 : 28, fontSize: mode === 'register' ? 20 : 24, fontFamily: 'var(--font-rajdhani)', fontWeight: 700, color: '#ffffff', textAlign: 'center', letterSpacing: 1 }}>
          {mode === 'login' ? 'Sign In' : 'Join LapizBlue Training Platform'}
        </h2>

        {mode === 'login' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 26 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 15, pointerEvents: 'none' }}>👤</div>
                <input aria-label="Username" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" style={INPUT_ICON_STYLE}
                  onFocus={e => { e.target.style.borderColor = 'rgba(227,6,19,0.6)'; e.target.style.boxShadow = '0 0 0 4px rgba(227,6,19,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 15, pointerEvents: 'none' }}>🔒</div>
                <input aria-label="Password" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} style={INPUT_ICON_STYLE}
                  onFocus={e => { e.target.style.borderColor = 'rgba(227,6,19,0.6)'; e.target.style.boxShadow = '0 0 0 4px rgba(227,6,19,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
              </div>
            </div>
            {loginError && (
              <div style={{ background: 'rgba(227,6,19,0.12)', border: '1px solid rgba(227,6,19,0.35)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, animation: 'loginShake 0.4s ease' }}>
                <span style={{ color: '#ff6b6b', fontSize: 16, flexShrink: 0 }}>&#x26A0;</span>
                <span style={{ color: '#ff8a8a', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{loginError}</span>
              </div>
            )}
            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', padding: '15px 24px', borderRadius: 14, border: 'none', background: '#E30613', color: 'white', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-inter),sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.25s', boxShadow: '0 4px 24px rgba(227,6,19,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54, position: 'relative', overflow: 'hidden' }}>
              {loading ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Please wait...</> : 'Login'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={() => showToast('Contact adil@lapizblue.com to reset your password', 'error')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', transition: 'color 0.2s', padding: '4px 0' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>
                Forgot Password?
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>🔐</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5 }}>Secure Login</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '18px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { setMode('register'); setToast(null) }} className="login-toggle-link">Create New Account</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input aria-label="First Name" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} style={INPUT_STYLE}
                  onFocus={e => { e.target.style.borderColor = 'rgba(227,6,19,0.6)'; e.target.style.boxShadow = '0 0 0 4px rgba(227,6,19,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
                <input aria-label="Last Name" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} style={INPUT_STYLE}
                  onFocus={e => { e.target.style.borderColor = 'rgba(227,6,19,0.6)'; e.target.style.boxShadow = '0 0 0 4px rgba(227,6,19,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
              </div>
              <input aria-label="Email Address" placeholder="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} style={INPUT_STYLE}
                onFocus={e => { e.target.style.borderColor = 'rgba(227,6,19,0.6)'; e.target.style.boxShadow = '0 0 0 4px rgba(227,6,19,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
              <input aria-label="Choose a Username" placeholder="Choose a Username" value={username} onChange={e => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" style={INPUT_STYLE}
                onFocus={e => { e.target.style.borderColor = 'rgba(227,6,19,0.6)'; e.target.style.boxShadow = '0 0 0 4px rgba(227,6,19,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
              <input aria-label="Password (min 6 chars)" placeholder="Password (min 6 chars)" type="password" value={password} onChange={e => setPassword(e.target.value)} style={INPUT_STYLE}
                onFocus={e => { e.target.style.borderColor = 'rgba(227,6,19,0.6)'; e.target.style.boxShadow = '0 0 0 4px rgba(227,6,19,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
              <input aria-label="Confirm Password" placeholder="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()} style={INPUT_STYLE}
                onFocus={e => { e.target.style.borderColor = 'rgba(227,6,19,0.6)'; e.target.style.boxShadow = '0 0 0 4px rgba(227,6,19,0.12)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }} />
            </div>
            <button onClick={handleRegister} disabled={loading}
              style={{ width: '100%', padding: '15px 24px', borderRadius: 14, border: 'none', background: '#E30613', color: 'white', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-inter),sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.25s', boxShadow: '0 4px 24px rgba(227,6,19,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54 }}>
              {loading ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Submitting...</> : 'Request Access'}
            </button>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { setMode('login'); setToast(null) }} className="login-toggle-link">Back to Login</button>
            </div>
          </>
        )}
      </div>

      {footer}

      <style jsx>{`
        @keyframes loginFadeIn { from { opacity:0;transform:translateY(-10px); } to { opacity:1;transform:translateY(0); } }
        @keyframes loginSlideUp { from { opacity:0;transform:translateY(30px); } to { opacity:1;transform:translateY(0); } }
        @keyframes loginShake { 0%,100% { transform:translateX(0); } 20%,60% { transform:translateX(-6px); } 40%,80% { transform:translateX(6px); } }
        .login-logo-anim { animation: loginFadeIn 0.3s ease both; }
        .login-card-anim { animation: loginSlideUp 0.3s ease 0.05s both; }
        .login-toggle-link { background:none;border:none;color:rgba(255,255,255,0.5);font-size:14px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;text-decoration:none;padding:4px 0;border-bottom:1px solid transparent; }
        .login-toggle-link:hover { color:#ffffff;border-bottom-color:rgba(255,255,255,0.5); }
        .stat-chip:hover { box-shadow:0 0 20px rgba(227,6,19,0.25);border-color:rgba(227,6,19,0.5);background:rgba(227,6,19,0.14); }
      `}</style>
    </div>
  )
}
