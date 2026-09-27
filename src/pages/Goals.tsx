import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { daysBetween, fmtDate, money, num, today } from '../lib/format'
import { ConfirmButton, Empty, Field, Modal, Progress } from '../components/ui'
import { Icon } from '../components/icons'
import type { Goal } from '../lib/types'

export default function Goals() {
  const d = useData()
  const [edit, setEdit] = useState<Goal | 'new' | null>(null)
  const [deposit, setDeposit] = useState<Goal | null>(null)

  return (
    <div>
      <div className="page-head">
        <h1>Savings goals</h1>
        <button className="btn primary" onClick={() => setEdit('new')}>
          <Icon name="plus" /> New goal
        </button>
      </div>
      {d.goals.length === 0 ? (
        <div className="card">
          <Empty icon="target">Save towards something specific, like an emergency fund or a new laptop. The app tells you how much to put aside each month.</Empty>
        </div>
      ) : (
        <div className="grid grid-2">
          {d.goals.map((g) => {
            const left = Math.max(0, g.target - g.saved)
            const months = g.deadline ? Math.max(1, Math.ceil(daysBetween(today(), g.deadline) / 30.4)) : null
            const done = g.saved >= g.target
            const late = g.deadline && g.deadline < today() && !done
            return (
              <div className="card" key={g.id}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <h2>{g.name}</h2>
                  <button className="icon-btn" onClick={() => setEdit(g)} aria-label={`Edit ${g.name}`}>
                    <Icon name="edit" />
                  </button>
                </div>
                <div className="row between small" style={{ marginBottom: 6 }}>
                  <span className="num">
                    <b>{money(g.saved)}</b> of {money(g.target)}
                  </span>
                  <span className="muted">{Math.min(100, Math.round((g.saved / g.target) * 100))}%</span>
                </div>
                <Progress value={g.saved} max={g.target} warnAt={2} />
                <div className="small muted" style={{ marginTop: 8 }}>
                  {done ? (
                    <span className="badge ok">Goal reached</span>
                  ) : late ? (
                    <span className="badge danger">Deadline passed · {money(left)} to go</span>
                  ) : months ? (
                    <>
                      Save about <b className="num">{money(Math.ceil(left / months))}</b>/month to reach it by {fmtDate(g.deadline)}
                    </>
                  ) : (
                    <>{money(left)} to go</>
                  )}
                </div>
                {!done && (
                  <button className="btn sm" style={{ marginTop: 12 }} onClick={() => setDeposit(g)}>
                    <Icon name="plus" /> Add money
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {edit && <GoalForm goal={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
      {deposit && <DepositForm goal={deposit} onClose={() => setDeposit(null)} />}
    </div>
  )
}

function GoalForm({ goal, onClose }: { goal?: Goal; onClose(): void }) {
  const d = useData()
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? String(goal.target) : '')
  const [saved, setSaved] = useState(goal ? String(goal.saved) : '0')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [err, setErr] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setErr('Give the goal a name.')
    if (num(target) <= 0) return setErr('Enter a target amount.')
    const row = { name: name.trim(), target: num(target), saved: num(saved), deadline: deadline || null }
    if (goal) await d.update('goals', goal.id, row)
    else await d.add('goals', row)
    onClose()
  }

  return (
    <Modal title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="What are you saving for?">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Goa trip" />
        </Field>
        <div className="form-row">
          <Field label="Target amount">
            <input className="input num" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
          <Field label="Already saved">
            <input className="input num" inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} />
          </Field>
        </div>
        <Field label="Target date" hint="optional">
          <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        {err && <div className="alert danger">{err}</div>}
        <div className="form-actions">
          {goal && (
            <ConfirmButton
              type="button"
              className="btn danger left"
              onClick={async () => {
                {
                  await d.remove('goals', goal.id)
                  onClose()
                }
              }}
            >
              Delete
            </ConfirmButton>
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

function DepositForm({ goal, onClose }: { goal: Goal; onClose(): void }) {
  const d = useData()
  const [amount, setAmount] = useState('')
  return (
    <Modal title={`Add to ${goal.name}`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          const n = num(amount)
          if (!n) return
          await d.update('goals', goal.id, { saved: Math.max(0, goal.saved + n) })
          onClose()
        }}
      >
        <Field label="Amount" hint="use a minus sign to take money out">
          <input className="input big num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </Modal>
  )
}
