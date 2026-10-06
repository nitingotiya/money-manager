import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { num, today } from '../lib/format'
import { PAYMENT_MODES, type Transaction, type TxType } from '../lib/types'
import { ConfirmButton, Field, Modal, Seg, haptic } from './ui'

export function TxForm({ tx, onClose }: { tx?: Transaction; onClose(): void }) {
  const { categories, add, update, remove } = useData()
  const [type, setType] = useState<TxType>(tx?.type ?? 'expense')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(tx?.category_id ?? null)
  const [date, setDate] = useState(tx?.date ?? today())
  const [note, setNote] = useState(tx?.note ?? '')
  const [mode, setMode] = useState(tx?.mode ?? 'UPI')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const cats = categories.filter((c) => c.type === type).sort((a, b) => a.name.localeCompare(b.name))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = num(amount)
    if (n <= 0) return setErr('Enter an amount greater than zero.')
    if (!date) return setErr('Pick a date.')
    const valid = cats.some((c) => c.id === categoryId) ? categoryId : null
    setBusy(true)
    try {
      const row = { type, amount: n, category_id: valid, date, note: note.trim(), mode }
      if (tx) await update('transactions', tx.id, row)
      else await add('transactions', row)
      haptic(15)
      onClose()
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal title={tx ? 'Edit transaction' : 'Add transaction'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Seg
          full
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />
        <Field label="Amount">
          <input className="input big num" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" aria-label="Amount" />
        </Field>
        <Field label="Category" group>
          <div className="chip-row">
            {cats.map((c) => (
              <button type="button" key={c.id} className={c.id === categoryId ? 'chip on' : 'chip'} onClick={() => setCategoryId(c.id)}>
                <span className="dot" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>
        </Field>
        <div className="form-row">
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Paid via">
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              {PAYMENT_MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Note" hint="optional">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lunch at office" />
        </Field>
        {err && <div className="alert danger">{err}</div>}
        <div className="form-actions">
          {tx && (
            <ConfirmButton
              type="button"
              className="btn danger left"
              onClick={async () => {
                {
                  await remove('transactions', tx.id)
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
          <button className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
