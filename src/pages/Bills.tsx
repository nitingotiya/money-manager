import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { billState, type BillState } from '../lib/calc'
import { fmtDate, monthKey, money, num, today } from '../lib/format'
import { Empty, Field, Modal } from '../components/ui'
import { Icon } from '../components/icons'
import type { Bill } from '../lib/types'

const BADGE: Record<BillState, [string, string]> = {
  paid: ['ok', 'Paid'],
  overdue: ['danger', 'Overdue'],
  'due-soon': ['warn', 'Due soon'],
  upcoming: ['neutral', 'Upcoming'],
}

export default function Bills() {
  const d = useData()
  const [edit, setEdit] = useState<Bill | 'new' | null>(null)
  const rows = d.bills.map((b) => ({ b, ...billState(b) })).sort((a, b) => {
    const order = { overdue: 0, 'due-soon': 1, upcoming: 2, paid: 3 }
    return order[a.state] - order[b.state] || a.due.localeCompare(b.due)
  })
  const monthlyTotal = d.bills.reduce((s, b) => s + b.amount, 0)
  const unpaid = rows.filter((r) => r.state !== 'paid').reduce((s, r) => s + r.b.amount, 0)

  async function markPaid(b: Bill) {
    await d.add('transactions', { type: 'expense', amount: b.amount, category_id: b.category_id, date: today(), note: b.name, mode: 'UPI' })
    await d.update('bills', b.id, { last_paid: monthKey() })
  }

  return (
    <div>
      <div className="page-head">
        <h1>Bills & recurring payments</h1>
        <button className="btn primary" onClick={() => setEdit('new')}>
          <Icon name="plus" /> New bill
        </button>
      </div>
      <div className="grid grid-2 stats2" style={{ marginBottom: 14 }}>
        <div className="card stat">
          <div className="label">Every month</div>
          <div className="value">{money(monthlyTotal)}</div>
        </div>
        <div className="card stat">
          <div className="label">Still to pay this month</div>
          <div className="value">{money(unpaid)}</div>
        </div>
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <Empty icon="calendar">Add rent, phone, internet, SIPs, insurance or your own EMIs. Marking one paid also records the expense.</Empty>
        ) : (
          <ul className="list">
            {rows.map(({ b, state, due, days }) => (
              <li key={b.id}>
                <div className="grow">
                  <div className="title">{b.name}</div>
                  <div className="muted small">
                    {state === 'paid'
                      ? `Paid for ${new Date().toLocaleDateString('en-IN', { month: 'long' })}`
                      : state === 'overdue'
                        ? `Was due ${fmtDate(due)} (${-days} day${days === -1 ? '' : 's'} ago)`
                        : days === 0
                          ? 'Due today'
                          : `Due ${fmtDate(due)} (in ${days} day${days === 1 ? '' : 's'})`}
                  </div>
                </div>
                <span className={'badge ' + BADGE[state][0]}>{BADGE[state][1]}</span>
                <span className="num" style={{ minWidth: 70, textAlign: 'right' }}>
                  {money(b.amount)}
                </span>
                {state !== 'paid' ? (
                  <button className="btn sm" onClick={() => markPaid(b)}>
                    <Icon name="check" /> <span className="hide-mobile">Mark paid</span>
                  </button>
                ) : (
                  <button className="btn sm ghost" onClick={() => d.update('bills', b.id, { last_paid: null })} title="Undo paid">
                    Undo
                  </button>
                )}
                <button className="icon-btn" onClick={() => setEdit(b)} aria-label={`Edit ${b.name}`}>
                  <Icon name="edit" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {edit && <BillForm bill={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function BillForm({ bill, onClose }: { bill?: Bill; onClose(): void }) {
  const d = useData()
  const [name, setName] = useState(bill?.name ?? '')
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '')
  const [dueDay, setDueDay] = useState(bill ? String(bill.due_day) : '1')
  const [categoryId, setCategoryId] = useState(bill?.category_id ?? d.categories.find((c) => c.name === 'Bills & Utilities')?.id ?? '')
  const [err, setErr] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const day = Math.round(num(dueDay))
    if (!name.trim()) return setErr('Give the bill a name.')
    if (num(amount) <= 0) return setErr('Enter the amount.')
    if (day < 1 || day > 31) return setErr('Due day must be between 1 and 31.')
    const row = { name: name.trim(), amount: num(amount), due_day: day, category_id: categoryId || null }
    if (bill) await d.update('bills', bill.id, row)
    else await d.add('bills', { ...row, last_paid: null })
    onClose()
  }

  return (
    <Modal title={bill ? 'Edit bill' : 'New bill'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Electricity" />
        </Field>
        <div className="form-row">
          <Field label="Amount">
            <input className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Due day of month">
            <input className="input num" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </Field>
        </div>
        <Field label="Category">
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {d.categories
              .filter((c) => c.type === 'expense')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        {err && <div className="alert danger">{err}</div>}
        <div className="form-actions">
          {bill && (
            <button
              type="button"
              className="btn danger left"
              onClick={async () => {
                await d.remove('bills', bill.id)
                onClose()
              }}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </Modal>
  )
}
