import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { fmtDate, money, num, today } from '../lib/format'
import { STATUS_LABEL, reminderText, schedule, spreadPayment, summarize, type Installment, type InstallmentStatus } from '../lib/loans'
import { ConfirmButton, Empty, Field, Modal, Progress, Seg, initials } from '../components/ui'
import { Icon } from '../components/icons'
import { LoanForm, statusBadge } from './Lending'
import type { Loan, LoanPayment } from '../lib/types'

const BADGE: Record<InstallmentStatus, string> = {
  early: 'ok',
  'on-time': 'ok',
  late: 'warn',
  partial: 'warn',
  overdue: 'danger',
  'due-soon': 'info',
  upcoming: 'neutral',
}

export default function LoanDetail() {
  const { id } = useParams()
  const d = useData()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  const [pay, setPay] = useState<{ inst?: Installment; payment?: LoanPayment } | null>(null)
  const [copied, setCopied] = useState(false)

  const loan = d.loans.find((l) => l.id === id)
  if (!loan)
    return (
      <div className="card">
        <Empty icon="users">
          This entry doesn't exist any more. <Link to="/lending">Back to Lending</Link>
        </Empty>
      </div>
    )

  const s = summarize(loan, d.loan_payments)
  const payments = d.loan_payments.filter((p) => p.loan_id === loan.id).sort((a, b) => b.paid_on.localeCompare(a.paid_on))
  const sch = loan.kind === 'emi' ? schedule(loan, d.loan_payments) : []
  const lent = loan.direction === 'lent'
  const msg = reminderText(loan, s, money, fmtDate)
  const phone = loan.phone.replace(/[^\d]/g, '')
  const waPhone = phone.length === 10 ? '91' + phone : phone

  return (
    <div className="stack">
      <div>
        <Link to="/lending" className="small row" style={{ gap: 4, textDecoration: 'none', marginBottom: 10 }}>
          <Icon name="left" className="inline-icon" /> Lending & EMIs
        </Link>
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div className="row">
            <div className="avatar">{initials(loan.person)}</div>
            <div>
              <div className="row" style={{ gap: 8 }}>
                <h1>
                  <Link to={`/lending/person/${encodeURIComponent(loan.person)}`} className="person-link">
                    {loan.person}
                  </Link>
                </h1>
                {statusBadge(s)}
              </div>
              <div className="muted small">
                {lent ? 'Owes you' : 'You owe'} · {loan.title}
                {loan.kind === 'emi' && loan.card ? ` · ${loan.card}` : ''}
              </div>
            </div>
          </div>
          <div className="row wrap">
            <button className="btn sm" onClick={() => setEditing(true)}>
              <Icon name="edit" /> Edit
            </button>
            <ConfirmButton
              className="btn sm danger"
              onClick={async () => {
                {
                  await d.remove('loans', loan.id)
                  nav('/lending')
                }
              }}
            >
              <Icon name="trash" /> Delete
            </ConfirmButton>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="stat-row">
          <div>
            <div className="muted small">Total</div>
            <div className="v">{money(s.total)}</div>
          </div>
          <div>
            <div className="muted small">{lent ? 'Received' : 'Paid'}</div>
            <div className="v income">{money(s.paid)}</div>
          </div>
          <div>
            <div className="muted small">Remaining</div>
            <div className="v">{money(s.outstanding)}</div>
          </div>
        </div>
        <div style={{ margin: '14px 0 8px' }}>
          <Progress value={s.paid} max={s.total} warnAt={2} />
        </div>
        <div className="row wrap small muted" style={{ gap: 16 }}>
          {loan.kind === 'emi' ? (
            <>
              {Number(loan.down_payment) > 0 && (
                <span>
                  {money(Number(loan.down_payment))} upfront{loan.down_payment_date ? ` on ${fmtDate(loan.down_payment_date)}` : ''}
                </span>
              )}
              <span>
                {money(loan.emi_amount)} × {loan.installments} months
              </span>
              {s.early + s.onTime + s.late > 0 && (
                <span>
                  {s.early} early · {s.onTime} on time · {s.late} late
                </span>
              )}
            </>
          ) : (
            <>
              <span>Given {fmtDate(loan.start_date)}</span>
              {loan.due_date && <span>Due {fmtDate(loan.due_date)}</span>}
            </>
          )}
          {s.overdueAmount > 0 && <span className="danger-text">{money(s.overdueAmount)} overdue</span>}
        </div>
        {loan.notes && <div className="small" style={{ marginTop: 10 }}>{loan.notes}</div>}

        <div className="row wrap" style={{ marginTop: 14 }}>
          {s.status !== 'settled' && (
            <button className="btn primary" onClick={() => setPay({ inst: sch.find((i) => i.paid < i.amount - 0.5) })}>
              <Icon name="plus" /> {lent ? 'Record payment received' : 'Record payment made'}
            </button>
          )}
          {lent && s.status !== 'settled' && (
            <>
              <a className="btn" href={`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
                <Icon name="message" /> WhatsApp reminder
              </a>
              <button
                className="btn ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(msg)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1800)
                  } catch {
                    /* clipboard blocked */
                  }
                }}
              >
                {copied ? 'Copied' : 'Copy message'}
              </button>
            </>
          )}
          {(loan.closed || s.outstanding > 0) && (
            <button className="btn ghost" onClick={() => d.update('loans', loan.id, { closed: !loan.closed })}>
              {loan.closed ? 'Reopen' : 'Close (write off rest)'}
            </button>
          )}
        </div>
      </div>

      {loan.kind === 'emi' && (
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>EMI schedule</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due</th>
                  <th className="r">EMI</th>
                  <th>Status</th>
                  <th className="hide-mobile">Paid on</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {Number(loan.down_payment) > 0 && (
                  <tr>
                    <td className="muted">–</td>
                    <td style={{ whiteSpace: 'nowrap' }}>Upfront</td>
                    <td className="r num">{money(Number(loan.down_payment))}</td>
                    <td>
                      <span className="badge ok">Paid upfront</span>
                      {loan.down_payment_date && <div className="muted small show-mobile">on {fmtDate(loan.down_payment_date)}</div>}
                    </td>
                    <td className="hide-mobile" style={{ whiteSpace: 'nowrap' }}>{fmtDate(loan.down_payment_date)}</td>
                    <td className="r">
                      <button className="btn sm" onClick={() => setEditing(true)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                )}
                {sch.map((i) => (
                  <tr key={i.no}>
                    <td className="muted">{i.no}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(i.due)}</td>
                    <td className="r num">
                      {money(i.amount)}
                      {i.paid > 0 && i.paid < i.amount - 0.5 && <div className="muted small">{money(i.paid)} paid</div>}
                    </td>
                    <td>
                      <span className={'badge ' + BADGE[i.status]}>{STATUS_LABEL[i.status]}</span>
                      {i.paidOn && <div className="muted small show-mobile">on {fmtDate(i.paidOn)}</div>}
                      {(i.status === 'early' || i.status === 'late') && (
                        <div className="muted small">
                          {Math.abs(i.daysOff)} day{Math.abs(i.daysOff) === 1 ? '' : 's'} {i.status === 'early' ? 'early' : 'late'}
                        </div>
                      )}
                      {(i.status === 'overdue' || i.status === 'partial') && i.due < today() && (
                        <div className="danger-text small">{i.daysOff} days past due</div>
                      )}
                    </td>
                    <td className="hide-mobile" style={{ whiteSpace: 'nowrap' }}>{i.paidOn ? fmtDate(i.paidOn) : '—'}</td>
                    <td className="r">
                      <button className="btn sm" onClick={() => setPay({ inst: i })}>
                        {i.paid >= i.amount - 0.5 ? 'Edit' : 'Record'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loan.kind === 'cash' && (
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>Repayments</h2>
          {payments.length === 0 ? (
            <div className="muted small">No repayments recorded yet.</div>
          ) : (
            <ul className="list">
              {payments.map((p) => {
                const early = loan.due_date && p.paid_on < loan.due_date
                const late = loan.due_date && p.paid_on > loan.due_date
                return (
                  <li key={p.id} className="clickable" onClick={() => setPay({ payment: p })}>
                    <div className="grow">
                      <div className="title">{fmtDate(p.paid_on)}</div>
                      {p.note && <div className="muted small">{p.note}</div>}
                    </div>
                    {loan.due_date && (
                      <span className={'badge ' + (late ? 'warn' : 'ok')}>{late ? 'Late' : early ? 'Early' : 'On time'}</span>
                    )}
                    <span className="num income">{money(p.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {editing && <LoanForm loan={loan} onClose={() => setEditing(false)} />}
      {pay && <PaymentForm loan={loan} inst={pay.inst} payment={pay.payment} remaining={s.outstanding} onClose={() => setPay(null)} />}
    </div>
  )
}

function PaymentForm({
  loan,
  inst,
  payment,
  remaining,
  onClose,
}: {
  loan: Loan
  inst?: Installment
  payment?: LoanPayment
  remaining: number
  onClose(): void
}) {
  const d = useData()
  const emi = loan.kind === 'emi'
  const sch = emi ? schedule(loan, d.loan_payments) : []
  const [no, setNo] = useState<number | null>(payment?.installment_no ?? inst?.no ?? sch.find((i) => i.paid < i.amount - 0.5)?.no ?? (emi ? 1 : null))
  const current = sch.find((i) => i.no === no)
  const defaultAmount = payment ? payment.amount : emi ? (current ? current.amount - current.paid : loan.emi_amount) : remaining
  const [amount, setAmount] = useState(String(defaultAmount || ''))
  const [paidOn, setPaidOn] = useState(payment?.paid_on ?? today())
  const [note, setNote] = useState(payment?.note ?? '')
  const [editingId, setEditingId] = useState<string | null>(payment?.id ?? null)
  const [err, setErr] = useState('')
  const [spread, setSpread] = useState<'one' | 'spread'>('one')

  const existing = emi && current ? current.payments : []
  const plan = emi && spread === 'spread' ? spreadPayment(loan, d.loan_payments, num(amount), no ?? 1) : null

  function pickInstallment(n: number) {
    setNo(n)
    const i = sch.find((x) => x.no === n)
    setEditingId(null)
    setAmount(String(i ? Math.max(0, i.amount - i.paid) || i.amount : loan.emi_amount))
    setPaidOn(today())
    setNote('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = num(amount)
    if (n <= 0) return setErr('Enter the amount paid.')
    if (!paidOn) return setErr('Pick the date it was paid.')
    if (plan && !editingId) {
      if (plan.left > 0) return setErr(`That is ${money(plan.left)} more than what is left on these EMIs. Lower the amount.`)
      for (const part of plan.parts) await d.add('loan_payments', { loan_id: loan.id, ...part, paid_on: paidOn, note: note.trim() || 'Lump sum' })
      return onClose()
    }
    const row = { loan_id: loan.id, installment_no: emi ? no : null, amount: n, paid_on: paidOn, note: note.trim() }
    if (editingId) await d.update('loan_payments', editingId, row)
    else await d.add('loan_payments', row)
    onClose()
  }

  const lent = loan.direction === 'lent'
  return (
    <Modal title={editingId ? 'Edit payment' : lent ? 'Payment received' : 'Payment made'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {emi && !editingId && (
          <Seg
            full
            value={spread}
            onChange={(v) => {
              setSpread(v)
              setErr('')
              if (v === 'spread') setAmount(String(remaining))
              else pickInstallment(no ?? 1)
            }}
            options={[
              { value: 'one', label: 'One EMI' },
              { value: 'spread', label: 'Lump sum over EMIs' },
            ]}
          />
        )}
        {emi && (
          <Field label={spread === 'spread' ? 'Start from EMI' : 'For EMI'}>
            <select className="input" value={no ?? 1} onChange={(e) => pickInstallment(Number(e.target.value))}>
              {sch.map((i) => (
                <option key={i.no} value={i.no}>
                  #{i.no} · due {fmtDate(i.due)} · {STATUS_LABEL[i.status]}
                </option>
              ))}
            </select>
          </Field>
        )}
        {plan && (
          <div className="alert info small" style={{ display: 'block' }}>
            {plan.parts.length === 0
              ? 'Enter an amount to see how it is split.'
              : plan.parts.map((p) => {
                  const i = sch.find((x) => x.no === p.installment_no)!
                  const full = p.amount >= i.amount - i.paid - 0.5
                  return (
                    <div key={p.installment_no}>
                      EMI #{p.installment_no}: {money(p.amount)} {full ? '(fully paid)' : `(part, ${money(i.amount - i.paid - p.amount)} still due)`}
                    </div>
                  )
                })}
            {plan.left > 0 && <div className="danger-text">{money(plan.left)} is more than what is left.</div>}
          </div>
        )}
        {spread === 'one' && existing.length > 0 && (
          <div className="card" style={{ padding: 10, background: 'var(--surface-2)', boxShadow: 'none' }}>
            <div className="small muted" style={{ marginBottom: 4 }}>Already recorded for this EMI</div>
            <ul className="list">
              {existing.map((p) => (
                <li key={p.id} style={{ padding: '6px 0' }}>
                  <span className="grow small">
                    {money(p.amount)} on {fmtDate(p.paid_on)}
                  </span>
                  <button
                    type="button"
                    className="btn sm ghost"
                    onClick={() => {
                      setEditingId(p.id)
                      setAmount(String(p.amount))
                      setPaidOn(p.paid_on)
                      setNote(p.note)
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="icon-btn" aria-label="Delete payment" onClick={() => d.remove('loan_payments', p.id)}>
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="form-row">
          <Field label="Amount">
            <input className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Paid on">
            <input className="input" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
        </div>
        {emi && spread === 'one' && current && paidOn && (
          <div className="small muted">
            {paidOn < current.due
              ? `Counts as paid early, before the ${fmtDate(current.due)} due date.`
              : paidOn === current.due
                ? 'Counts as paid on time.'
                : `Counts as paid late, after the ${fmtDate(current.due)} due date.`}
          </div>
        )}
        <Field label="Note" hint="optional">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. via GPay" />
        </Field>
        {err && <div className="alert danger">{err}</div>}
        <div className="form-actions">
          {editingId && (
            <button
              type="button"
              className="btn danger left"
              onClick={async () => {
                await d.remove('loan_payments', editingId)
                onClose()
              }}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">{editingId ? 'Save changes' : 'Save payment'}</button>
        </div>
      </form>
    </Modal>
  )
}
