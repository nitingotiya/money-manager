import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { TableName } from './types'

type Row = { id: string } & Record<string, unknown>

export interface Backend {
  mode: 'cloud' | 'local'
  list(table: TableName): Promise<Row[]>
  insert(table: TableName, row: Row): Promise<Row>
  update(table: TableName, id: string, patch: Record<string, unknown>): Promise<Row>
  remove(table: TableName, id: string): Promise<void>
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase client, or null when the app runs in local demo mode (no keys configured). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export function cloudBackend(client: SupabaseClient, userId: string): Backend {
  const check = <T,>(res: { data: T; error: { message: string } | null }) => {
    if (res.error) throw new Error(res.error.message)
    return res.data
  }
  return {
    mode: 'cloud',
    async list(table) {
      return check(await client.from(table).select('*')) as Row[]
    },
    async insert(table, row) {
      return check(await client.from(table).insert({ ...row, user_id: userId }).select().single()) as Row
    },
    async update(table, id, patch) {
      return check(await client.from(table).update(patch).eq('id', id).select().single()) as Row
    },
    async remove(table, id) {
      check(await client.from(table).delete().eq('id', id))
    },
  }
}

/** Stores everything in this browser's localStorage. Used for demo mode and offline testing. */
export function localBackend(userId: string): Backend {
  const k = (t: TableName) => `mm:${userId}:${t}`
  const read = (t: TableName): Row[] => {
    try {
      return JSON.parse(localStorage.getItem(k(t)) || '[]')
    } catch {
      return []
    }
  }
  const write = (t: TableName, rows: Row[]) => {
    try {
      localStorage.setItem(k(t), JSON.stringify(rows))
    } catch {
      /* storage full or blocked; keep in memory only */
    }
  }
  return {
    mode: 'local',
    async list(table) {
      return read(table)
    },
    async insert(table, row) {
      const r = { ...row, user_id: userId }
      write(table, [...read(table), r])
      return r
    },
    async update(table, id, patch) {
      let out: Row | undefined
      write(
        table,
        read(table).map((r) => (r.id === id ? (out = { ...r, ...patch }) : r)),
      )
      if (!out) throw new Error('Not found')
      return out
    },
    async remove(table, id) {
      const rows = read(table)
      const next = rows.filter((r) => r.id !== id)
      if (table === 'loans') write('loan_payments', read('loan_payments').filter((p) => p.loan_id !== id))
      write(table, next)
    },
  }
}
