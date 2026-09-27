import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './backend'

export interface AppUser {
  id: string
  email: string
}

interface AuthState {
  user: AppUser | null
  loading: boolean
  cloud: boolean
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<string>
  resetPassword(email: string): Promise<void>
  startDemo(): void
  signOut(): Promise<void>
}

const Ctx = createContext<AuthState | null>(null)
const DEMO_KEY = 'mm:demo-session'
// Where links in sign-up and password emails should open. In the Android app the page's own address
// (https://localhost) only exists on the phone, so the public website address is used when set.
const redirectTo = () => import.meta.env.VITE_SITE_URL || window.location.origin + window.location.pathname

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      try {
        if (localStorage.getItem(DEMO_KEY)) setUser({ id: 'local', email: 'This device' })
      } catch {
        /* ignore */
      }
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    user,
    loading,
    cloud: !!supabase,
    async signIn(email, password) {
      if (!supabase) return
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signUp(email, password) {
      if (!supabase) return ''
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo() },
      })
      if (error) throw error
      return data.session ? '' : 'Check your email to confirm your account, then sign in.'
    },
    async resetPassword(email) {
      if (!supabase) return
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo(),
      })
      if (error) throw error
    },
    startDemo() {
      try {
        localStorage.setItem(DEMO_KEY, '1')
      } catch {
        /* ignore */
      }
      setUser({ id: 'local', email: 'This device' })
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
      try {
        localStorage.removeItem(DEMO_KEY)
      } catch {
        /* ignore */
      }
      setUser(null)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}
