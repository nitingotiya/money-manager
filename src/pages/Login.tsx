import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { Field, Seg } from '../components/ui'

export default function Login() {
  const { cloud, signIn, signUp, resetPassword, startDemo } = useAuth()
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setMsg('')
    setBusy(true)
    try {
      if (mode === 'in') await signIn(email.trim(), password)
      else if (mode === 'up') {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
        const m = await signUp(email.trim(), password)
        if (m) setMsg(m)
      } else {
        await resetPassword(email.trim())
        setMsg('If that email has an account, a reset link is on its way.')
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand" style={{ padding: '0 0 6px' }}>
          <img src="./icon.svg" alt="" />
          Money Manager
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Track spending, budgets, bills, savings goals, and the money friends owe you.
        </p>

        {cloud ? (
          <form className="form" onSubmit={submit}>
            {mode !== 'reset' && (
              <Seg
                full
                value={mode}
                onChange={(v) => setMode(v)}
                options={[
                  { value: 'in', label: 'Sign in' },
                  { value: 'up', label: 'Create account' },
                ]}
              />
            )}
            <Field label="Email">
              <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {mode !== 'reset' && (
              <Field label="Password">
                <input
                  className="input"
                  type="password"
                  autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            )}
            {err && <div className="alert danger">{err}</div>}
            {msg && <div className="alert info">{msg}</div>}
            <button className="btn primary" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setMode(mode === 'reset' ? 'in' : 'reset')}>
              {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </form>
        ) : (
          <div className="stack">
            <div className="alert info small">
              Running in demo mode. Your data stays in this browser only. Connect Supabase (see README) to enable accounts and sync across devices.
            </div>
            <button className="btn primary" onClick={startDemo}>
              Start using the app
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
