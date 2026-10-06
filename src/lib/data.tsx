import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cloudBackend, localBackend, supabase, type Backend } from './backend'
import { setCurrency, uid } from './format'
import { TABLES, type Settings, type TableName, type Tables } from './types'
import { useAuth } from './auth'
import { DEFAULT_CATEGORIES, sampleData } from './seed'

type Store = { [K in TableName]: Tables[K][] }
const empty = (): Store => Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Store

interface DataState extends Omit<Store, 'settings'> {
  ready: boolean
  error: string
  mode: 'cloud' | 'local'
  settings: Settings
  add<K extends TableName>(table: K, row: Omit<Tables[K], 'id' | 'user_id'>): Promise<Tables[K]>
  update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<void>
  remove(table: TableName, id: string): Promise<void>
  loadSample(): Promise<void>
  /** Deletes every entry and restores the default categories. Name, currency and theme are kept. */
  eraseAll(): Promise<void>
  clearError(): void
}

const Ctx = createContext<DataState | null>(null)

// One in-flight load per backend, so a re-run effect never seeds default rows twice.
const loads = new WeakMap<Backend, Promise<Store>>()
function loadOnce(backend: Backend) {
  let p = loads.get(backend)
  if (!p) {
    p = (async () => {
      const lists = await Promise.all(TABLES.map((t) => backend.list(t)))
      const s = Object.fromEntries(TABLES.map((t, i) => [t, lists[i]])) as unknown as Store
      // First sign-in: create default categories and settings.
      if (s.categories.length === 0) {
        s.categories = (await Promise.all(
          DEFAULT_CATEGORIES.map((c) => backend.insert('categories', { id: uid(), ...c })),
        )) as unknown as Store['categories']
      }
      if (s.settings.length === 0) {
        s.settings = [
          (await backend.insert('settings', { id: uid(), currency: 'INR', display_name: '' })) as unknown as Settings,
        ]
      }
      return s
    })()
    p.catch(() => loads.delete(backend))
    loads.set(backend, p)
  }
  return p
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [store, setStore] = useState<Store>(empty)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  const backend: Backend | null = useMemo(() => {
    if (!user) return null
    return supabase ? cloudBackend(supabase, user.id) : localBackend(user.id)
  }, [user])

  useEffect(() => {
    if (!backend) {
      setStore(empty())
      setReady(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const s = await loadOnce(backend)
        if (!cancelled) {
          setStore(s)
          setReady(true)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [backend])

  const settings: Settings = store.settings[0] ?? { id: '', currency: 'INR', display_name: '' }
  setCurrency(settings.currency)

  const guard = useCallback(async <T,>(fn: () => Promise<T>) => {
    try {
      return await fn()
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }, [])

  const value: DataState = {
    ...store,
    ready,
    error,
    mode: backend?.mode ?? 'local',
    settings,
    clearError: () => setError(''),
    async add(table, row) {
      const saved = await guard(() => backend!.insert(table, { id: uid(), ...(row as object) }))
      setStore((s) => ({ ...s, [table]: [...s[table], saved] }))
      return saved as unknown as Tables[typeof table]
    },
    async update(table, id, patch) {
      const saved = await guard(() => backend!.update(table, id, patch as Record<string, unknown>))
      setStore((s) => ({
        ...s,
        [table]: (s[table] as { id: string }[]).map((r) => (r.id === id ? saved : r)),
      }))
    },
    async remove(table, id) {
      await guard(async () => {
        await backend!.remove(table, id)
        // Mirror the database's ON DELETE rules in the local store.
        if (table === 'categories' && backend!.mode === 'local') {
          for (const b of store.budgets.filter((b) => b.category_id === id)) await backend!.remove('budgets', b.id)
          for (const t of store.transactions.filter((t) => t.category_id === id))
            await backend!.update('transactions', t.id, { category_id: null })
          for (const b of store.bills.filter((b) => b.category_id === id))
            await backend!.update('bills', b.id, { category_id: null })
        }
      })
      setStore((s) => {
        const next = { ...s, [table]: (s[table] as { id: string }[]).filter((r) => r.id !== id) } as Store
        if (table === 'loans') next.loan_payments = s.loan_payments.filter((p) => p.loan_id !== id)
        if (table === 'categories') {
          next.budgets = s.budgets.filter((b) => b.category_id !== id)
          next.transactions = s.transactions.map((t) => (t.category_id === id ? { ...t, category_id: null } : t))
          next.bills = s.bills.map((b) => (b.category_id === id ? { ...b, category_id: null } : b))
        }
        return next
      })
    },
    async eraseAll() {
      await guard(async () => {
        // Children before parents, so nothing points at a deleted row.
        const order: TableName[] = ['loan_payments', 'loans', 'transactions', 'budgets', 'bills', 'goals', 'categories']
        for (const t of order) for (const r of store[t] as { id: string }[]) await backend!.remove(t, r.id)
        const cats = (await Promise.all(
          DEFAULT_CATEGORIES.map((c) => backend!.insert('categories', { id: uid(), ...c })),
        )) as unknown as Store['categories']
        setStore((s) => ({
          ...s,
          loan_payments: [], loans: [], transactions: [], budgets: [], bills: [], goals: [], categories: cats,
        }))
      })
    },
    async loadSample() {
      const data = sampleData(store.categories)
      for (const table of Object.keys(data) as TableName[]) {
        for (const row of data[table] ?? []) {
          const saved = await guard(() => backend!.insert(table, row as never))
          setStore((s) => ({ ...s, [table]: [...s[table], saved] }))
        }
      }
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useData outside DataProvider')
  return c
}
