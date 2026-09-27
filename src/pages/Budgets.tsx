import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { inMonth, spentByCategory } from '../lib/calc'
import { monthKey, money, num } from '../lib/format'
import { Empty, Field, Modal, MonthPicker, Progress } from '../components/ui'
import { Icon } from '../components/icons'
import type { Budget } from '../lib/types'

export default function Budgets() {
  const d = useData()
  const [month, setMonth] = useState(monthKey())
  const [edit, setEdit] = useState<Budget | 'new' | null>(null)
  const spent = spentByCategory(inMonth(d.transactions, month))
  const cat = (id: string) => d.categories.find((c) => c.id === id)
  const rows = d.budgets
    .map((b) => ({ b, used: spent.get(b.category_id) ?? 0, c: cat(b.category_id) }))
    .sort((a, b) => b.used / (b.b.amount || 1) - a.used / (a.b.amount || 1))
  const totalLimit = rows.reduce((s, r) => s + r.b.amount, 0)
  const totalUsed = rows.reduce((s, r) => s + r.used, 0)

  return (
    <div>
      <div className="page-head">
        <h1>Budgets</h1>
        <button className="btn primary" onClick={() => setEdit('new')}>
          <Icon name="plus" /> New budget
        </button>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row wrap between">
          <MonthPicker value={month} onChange={setMonth} />
          {rows.length > 0 && (
            <div className="small">
              <span className="num">{money(totalUsed)}</span> of <span className="num">{money(totalLimit)}</span> used
            </div>
          )}
        </div>
        {rows.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Progress value={totalUsed} max={totalLimit} />
          </div>
        )}
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <Empty icon="wallet">Set a monthly limit for categories like Food or Shopping and the app warns you at 80% and 100%.</Empty>
        ) : (
          <div className="stack" style={{ gap: 18 }}>
            {rows.map(({ b, used, c }) => {
              const left = b.amount - used
              return (
                <div key={b.id}>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <div className="row">
                      <span className="dot" style={{ background: c?.color }} />
                      <b>{c?.name ?? 'Deleted category'}</b>
                    </div>
                    <button className="icon-btn" onClick={() => setEdit(b)} aria-label={`Edit ${c?.name} budget`}>
                      <Icon name="edit" />
                    </button>
                  </div>
                  <Progress value={used} max={b.amount} />
                  <div className="row between small" style={{ marginTop: 6 }}>
                    <span className="num">
                      {money(used)} of {money(b.amount)}
                    </span>
                    {left >= 0 ? (
                      <span className="muted num">{money(left)} left</span>
                    ) : (
                      <span className="danger-text num">{money(-left)} over</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {edit && <BudgetForm budget={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function BudgetForm({ budget, onClose }: { budget?: Budget; onClose(): void }) {
  const d = useData()
  const used = new Set(d.budgets.filter((b) => b.id !== budget?.id).map((b) => b.category_id))
  const options = d.categories.filter((c) => c.type === 'expense' && !used.has(c.id))
  const [categoryId, setCategoryId] = useState(budget?.category_id ?? options[0]?.id ?? '')
  const [amount, setAmount] = useState(budget ? String(budget.amount) : '')
  const [err, setErr] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = num(amount)
    if (!categoryId) return setErr('Pick a category.')
    if (n <= 0) return setErr('Enter a monthly limit above zero.')
    if (budget) await d.update('budgets', budget.id, { category_id: categoryId, amount: n })
    else await d.add('budgets', { category_id: categoryId, amount: n })
    onClose()
  }

  return (
    <Modal title={budget ? 'Edit budget' : 'New budget'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {options.length === 0 && !budget ? (
          <div className="alert info">Every expense category already has a budget.</div>
        ) : (
          <>
            <Field label="Category">
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Monthly limit">
              <input className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </Field>
          </>
        )}
        {err && <div className="alert danger">{err}</div>}
        <div className="form-actions">
          {budget && (
            <button
              type="button"
              className="btn danger left"
              onClick={async () => {
                await d.remove('budgets', budget.id)
                onClose()
              }}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={options.length === 0 && !budget}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
