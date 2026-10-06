import { Suspense, createContext, lazy, useContext, useEffect, useState, type ReactNode } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { DataProvider, useData } from './lib/data'
import { Icon } from './components/icons'
import { TxForm } from './components/TxForm'
import { haptic } from './components/ui'
import { useNativeFeel } from './lib/native'
import { UpdateBanner, WhatsNew } from './components/UpdateUI'
import { UpdateProvider } from './lib/updates'
import type { Transaction } from './lib/types'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Bills from './pages/Bills'
import Lending from './pages/Lending'
import LoanDetail from './pages/LoanDetail'
import Settings from './pages/Settings'
import More from './pages/More'

const Reports = lazy(() => import('./pages/Reports'))
const Person = lazy(() => import('./pages/Person'))

interface UI {
  openTx(tx?: Transaction): void
}
const UICtx = createContext<UI>({ openTx() {} })
export const useUI = () => useContext(UICtx)

const NAV = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/transactions', label: 'Transactions', icon: 'list' },
  { to: '/lending', label: 'Lending & EMIs', icon: 'users' },
  { to: '/budgets', label: 'Budgets', icon: 'wallet' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
  { to: '/goals', label: 'Savings goals', icon: 'target' },
  { to: '/bills', label: 'Bills', icon: 'calendar' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]
const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/transactions', label: 'Money', icon: 'list' },
  { to: '/lending', label: 'Lending', icon: 'users' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
  { to: '/more', label: 'More', icon: 'menu' },
]

function Layout({ children }: { children: ReactNode }) {
  const [tx, setTx] = useState<{ open: boolean; tx?: Transaction }>({ open: false })
  const loc = useLocation()
  useNativeFeel(() => setTx({ open: true }))
  const moreActive = ['/more', '/budgets', '/goals', '/bills', '/settings'].some((p) => loc.pathname.startsWith(p))
  return (
    <UICtx.Provider value={{ openTx: (t) => setTx({ open: true, tx: t }) }}>
      <div className="shell">
        <nav className="sidebar" aria-label="Main">
          <div className="brand">
            <img src="./icon.svg" alt="" />
            Money Manager
          </div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
          <div className="spacer" />
          <button className="btn primary" onClick={() => setTx({ open: true })}>
            <Icon name="plus" /> Add transaction
          </button>
        </nav>
        <main className="main">{children}</main>
      </div>
      <nav className="bottom-nav" aria-label="Main">
        {MOBILE_NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => (isActive || (n.to === '/more' && moreActive) ? 'active' : '')}
          >
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        ))}
      </nav>
      {!loc.pathname.startsWith('/lending') && (
        <button
          className="fab"
          onClick={() => {
            haptic()
            setTx({ open: true })
          }}
          aria-label="Add transaction"
        >
          <Icon name="plus" />
        </button>
      )}
      {tx.open && <TxForm tx={tx.tx} onClose={() => setTx({ open: false })} />}
    </UICtx.Provider>
  )
}

function Boot() {
  return (
    <div className="boot" role="status">
      <img src="./icon.svg" alt="" />
      <span>Money Manager</span>
    </div>
  )
}

/** Keeps each screen's scroll position: new screens start at the top, going back returns to where you were. */
function useScrollMemory() {
  const loc = useLocation()
  const type = useNavigationType()
  useEffect(() => {
    const key = 'mm:scroll:' + loc.pathname
    let y = 0
    if (type === 'POP') {
      try {
        y = Number(sessionStorage.getItem(key)) || 0
      } catch {
        /* ignore */
      }
    }
    requestAnimationFrame(() => window.scrollTo(0, y))
    const save = () => {
      try {
        sessionStorage.setItem(key, String(window.scrollY))
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [loc.pathname, type])
}

function Screen({ children }: { children: ReactNode }) {
  const loc = useLocation()
  useScrollMemory()
  return (
    <div key={loc.pathname} className="screen">
      {children}
    </div>
  )
}

function Gate() {
  const { user, loading } = useAuth()
  const { ready, error, clearError } = useData()
  if (loading) return <Boot />
  if (!user) return <Login />
  if (!ready)
    return (
      <div className="auth-wrap">
        {error ? (
          <div className="card auth-card stack">
            <h2>Couldn't load your data</h2>
            <div className="alert danger">{error}</div>
            <p className="muted small">If this is a new setup, check that you ran supabase/schema.sql in your Supabase project.</p>
            <button className="btn" onClick={() => location.reload()}>Try again</button>
          </div>
        ) : (
          <Boot />
        )}
      </div>
    )
  return (
    <Layout>
      <UpdateBanner />
      <WhatsNew />
      {error && (
        <div className="alert danger" style={{ marginBottom: 14 }}>
          <span className="grow">{error}</span>
          <button className="icon-btn" onClick={clearError} aria-label="Dismiss">
            <Icon name="x" />
          </button>
        </div>
      )}
      <Screen>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/reports" element={<Suspense fallback={<div className="muted">Loading…</div>}><Reports /></Suspense>} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/lending" element={<Lending />} />
        <Route path="/lending/:id" element={<LoanDetail />} />
        <Route path="/lending/person/:name" element={<Suspense fallback={<div className="muted">Loading…</div>}><Person /></Suspense>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/more" element={<More />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </Screen>
    </Layout>
  )
}

export default function App() {
  return (
    <UpdateProvider>
    <AuthProvider>
      <DataProvider>
        <HashRouter>
          <Gate />
        </HashRouter>
      </DataProvider>
    </AuthProvider>
    </UpdateProvider>
  )
}
