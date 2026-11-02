'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const ALL_BADGES = [
  { name: 'First Quiz', icon: '🎯', desc: 'Complete your first quiz' },
  { name: 'Perfect Score', icon: '💯', desc: 'Score 100% on any quiz' },
  { name: 'Level Up', icon: '⬆️', desc: 'Advance to next difficulty level' },
  { name: 'On Fire', icon: '🔥', desc: 'Complete 5 quizzes' },
  { name: 'Weekly Champion', icon: '🏆', desc: 'Win the weekly challenge' },
  { name: 'Master', icon: '👑', desc: 'Pass Expert level' },
]


export default function Badges() {
  const [earned, setEarned] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    if (!u) { router.push('/'); return }
    setUser(u)
    supabase.from('badges').select('badge_name').eq('user_id', u.id).then(({ data }) => {
      setEarned((data || []).map(b => b.badge_name)); setLoading(false)
    })
  }, [])

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="navbar">
          <img src="/lapizblue-logo.webp" alt="LapizBlue" width={105} height={26} style={{ height: 26, width: 'auto', filter: 'brightness(1.8)' }} />
          <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 18, fontWeight: 700 }}>My Badges</div>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => router.push('/dashboard')}>Back</button>
        </div>

        <div className="page">
          {loading ? (
            <div className="loading-screen"><div className="spinner" /><span>Loading badges...</span></div>
          ) : (
            <>
              <div className="card animate-fade" style={{ marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-rajdhani)', fontSize: 36, fontWeight: 800, color: '#fbbf24' }}>
                  {earned.length} / {ALL_BADGES.length}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Badges Earned</div>
                <div className="progress-bar" style={{ marginTop: 14, height: 8 }}>
                  <div className="progress-fill" style={{ width: `${(earned.length / ALL_BADGES.length) * 100}%`, background: '#fbbf24' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                {ALL_BADGES.map((b, i) => {
                  const have = earned.includes(b.name)
                  return (
                    <div key={b.name} className={`card animate-fade ${have ? 'card-hover' : ''}`}
                      style={{
                        textAlign: 'center',
                        opacity: have ? 1 : 0.35,
                        borderColor: have ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.06)',
                        borderWidth: have ? 2 : 1,
                        animationDelay: `${i * 0.06}s`,
                        position: 'relative', overflow: 'hidden',
                        filter: have ? 'none' : 'grayscale(0.5)',
                        boxShadow: have ? '0 0 24px rgba(251,191,36,0.08)' : 'var(--shadow)',
                      }}>
                      {have && (
                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(34,197,94,0.15)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✅</div>
                      )}
                      <div style={{ fontSize: 52, marginBottom: 10, filter: have ? 'none' : 'blur(1px)' }}>{b.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 17, fontFamily: 'var(--font-rajdhani)' }}>{b.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{b.desc}</div>
                      {!have && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>🔒 Locked</div>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
          <div className="app-footer">Made by Adil Mohamed&nbsp;&nbsp;|&nbsp;&nbsp;LapizBlue &copy; 2026</div>
        </div>
      </div>
    </div>
  )
}
