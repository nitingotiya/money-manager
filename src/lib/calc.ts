import { daysBetween, monthKey, toISODate, today } from './format'
import type { Bill, Transaction } from './types'

export function inMonth(txs: Transaction[], key: string) {
  return txs.filter((t) => t.date.startsWith(key))
}

export function totals(txs: Transaction[]) {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, net: income - expense }
}

export function spentByCategory(txs: Transaction[]) {
  const m = new Map<string | null, number>()
  for (const t of txs) if (t.type === 'expense') m.set(t.category_id, (m.get(t.category_id) ?? 0) + t.amount)
  return m
}

/** Due date of a monthly bill within a given month, clamped to the month's last day. */
export function billDueDate(bill: Bill, key = monthKey()) {
  const [y, m] = key.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return toISODate(new Date(y, m - 1, Math.min(bill.due_day, last)))
}

export type BillState = 'paid' | 'overdue' | 'due-soon' | 'upcoming'

export function billState(bill: Bill, now = today()): { state: BillState; due: string; days: number } {
  const key = monthKey(now)
  const due = billDueDate(bill, key)
  const days = daysBetween(now, due)
  if (bill.last_paid && bill.last_paid >= key) return { state: 'paid', due, days }
  if (days < 0) return { state: 'overdue', due, days }
  return { state: days <= 5 ? 'due-soon' : 'upcoming', due, days }
}
