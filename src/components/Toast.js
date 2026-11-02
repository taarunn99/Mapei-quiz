'use client'
import { useEffect } from 'react'

export default function Toast({ message, type = 'error', onClose, duration = 4000 }) {
  useEffect(() => { const t = setTimeout(onClose, duration); return () => clearTimeout(t) }, [onClose, duration])
  const ok = type === 'success'
  return (
    <div role="status" aria-live="polite" className="toast-wrap">
      <div className={`toast ${ok ? 'toast-success' : 'toast-error'}`}>
        <span aria-hidden="true">{ok ? '✓' : '✕'}</span> {message}
      </div>
    </div>
  )
}
