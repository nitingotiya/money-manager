import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { fmtDate, money, num, today } from '../lib/format'
import { summarize, type LoanSummary } from '../lib/loans'
import { Empty, Field, Modal, Progress, Seg, initials } from '../components/ui'
import { Icon } from '../components/icons'
import type { Loan, LoanDirection, LoanKind } from '../lib/types'

export function statusBadge(s: LoanSummary) {
  if (s.status === 'settled') return <span className="badge ok">Settled</span>
  if (s.status === 'overdue') return <span className="badge danger">Overdue</span>
  return <span className="badge info">Active</span>
}

export default function Lending() {
  const d = useData()
  const nav = useNavigate()
  const [dir, setDir] = useState<LoanDirection>('lent')
  const [show, setShow] = useState<'open' | 'settled'>('open')
  const [adding, setAdding] = useState(false)

  const all = d.loans.map((l) => ({ l, s: summarize(l, d.loan_payments) }))
  const mine = all.filter((x) => x.l.direction === dir)
  const open = mine.filter((x) => x.s.status !== 'settled')
  const rows = (show === 'open' ? open : mine.filter((x) => x.s.status === 'settled')).sort(
    (a, b) =>
      (a.s.status === 'overdue' ? 0 : 1) - (b.s.status === 'overdue' ? 0 : 1) ||
      (a.s.nextDue ?? '9999').localeCompare(b.s.nextDue ?? '9999'),
  )
  const outstanding = open.reduce((s, x) => s + x.s.outstanding, 0)
  const overdue = open.reduce((s, x) => s + x.s.overdueAmount, 0)

  // Per-person totals
  const people = new Map<string, { out: number; overdue: number; count: number; total: number }>()
  for (const x of mine) {
    const p = people.get(x.l.person) ?? { out: 0, overdue: 0, count: 0, total: 0 }
    if (x.s.status !== 'settled') {
      p.out += x.s.outstanding
      p.overdue += x.s.overdueAmount
      p.count++
    }
    p.total++
    people.set(x.l.person, p)
  }

  return (
    <div>
      <div className="page-head">
        <h1>Lending & EMIs</h1>
        <button className="btn primary" onClick={() => setAdding(true)}>
          <Icon name="plus" /> New entry
        </button>
      </div>

      <Seg
        full
        value={dir}
        onChange={setDir}
        options={[
          { value: 'lent', label: 'Friends owe me' },
          { value: 'borrowed', label: 'I owe' },
        ]}
      />

      <div className="grid grid-2 stats2" style={{ margin: '14px 0' }}>
        <div className="card stat">
          <div className="label">{dir === 'lent' ? 'Still to get back' : 'Still to pay'}</div>
          <div className="value">{money(outstanding)}</div>
        </div>
        <div className="card stat">
          <div className="label">Overdue</div>
          <div className={'value ' + (overdue > 0 ? 'danger-text' : '')}>{money(overdue)}</div>
        </div>
      </div>

      {people.size > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-head" style={{ marginBottom: 4 }}>
            <h2>People</h2>
            <span className="muted small">Tap a name for charts and full history</span>
          </div>
          <ul className="list">
            {[...people]
              .sort((a, b) => b[1].out - a[1].out)
              .map(([name, p]) => (
                <li key={name} className="clickable" onClick={() => nav(`/lending/person/${encodeURIComponent(name)}`)}>
                  <div className="avatar">{initials(name)}</div>
                  <div className="grow">
                    <div className="title">{name}</div>
                    <div className="muted small">
                      {p.count ? `${p.count} open` : 'All settled'} · {p.total} {p.total === 1 ? 'entry' : 'entries'} in total
                      {p.overdue > 0 && <span className="danger-text"> · {money(p.overdue)} overdue</span>}
                    </div>
                  </div>
                  <b className="num">{money(p.out)}</b>
                  <Icon name="right" className="inline-icon" />
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>{show === 'open' ? 'Open' : 'Settled'}</h2>
          <Seg
            value={show}
            onChange={setShow}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'settled', label: 'Settled' },
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <Empty icon="users">
            {show === 'settled'
              ? 'Nothing settled yet.'
              : dir === 'lent'
                ? 'Lent cash to a friend, or bought something on EMI with your card for them? Add it here and track each repayment.'
                : 'Track money you borrowed and pay it back on time.'}
          </Empty>
        ) : (
          <ul className="list">
            {rows.map(({ l, s }) => (
              <li key={l.id} className="clickable" onClick={() => nav(`/lending/${l.id}`)}>
                <div className="avatar">{initials(l.person)}</div>
                <div className="grow">
                  <div className="row" style={{ gap: 8 }}>
                    <span className="title">{l.person}</span>
                    {statusBadge(s)}
                  </div>
                  <div className="muted small" style={{ margin: '2px 0 6px' }}>
                    {l.kind === 'emi' ? (
                      <>
                        <Icon name="card" className="inline-icon" /> {l.title} · EMI {money(l.emi_amount)} × {l.installments}
                        {l.card ? ` · ${l.card}` : ''}
                      </>
                    ) : (
                      <>
                        {l.title || 'Cash'} · given {fmtDate(l.start_date)}
                        {l.due_date ? ` · due ${fmtDate(l.due_date)}` : ''}
                      </>
                    )}
                  </div>
                  <Progress value={s.paid} max={s.total} warnAt={2} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 650 }}>{money(s.outstanding)}</div>
                  <div className="muted small">left</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {adding && <LoanForm direction={dir} onClose={() => setAdding(false)} onSaved={(id) => nav(`/lending/${id}`)} />}
    </div>
  )
}

export function LoanForm({
  loan,
  direction,
  onClose,
  onSaved,
}: {
  loan?: Loan
  direction?: LoanDirection
  onClose(): void
  onSaved?(id: string): void
}) {
  const d = useData()
  const [dir, setDir] = useState<LoanDirection>(loan?.direction ?? direction ?? 'lent')
  const [kind, setKind] = useState<LoanKind>(loan?.kind ?? 'cash')
  const [person, setPerson] = useState(loan?.person ?? '')
  const [phone, setPhone] = useState(loan?.phone ?? '')
  const [title, setTitle] = useState(loan?.title ?? '')
  const [principal, setPrincipal] = useState(loan ? String(loan.principal || '') : '')
  const [card, setCard] = useState(loan?.card ?? '')
  const [emi, setEmi] = useState(loan ? String(loan.emi_amount || '') : '')
  const [months, setMonths] = useState(loan ? String(loan.installments || '') : '')
  const [start, setStart] = useState(loan?.start_date ?? today())
  const [due, setDue] = useState(loan?.due_date ?? '')
  const [notes, setNotes] = useState(loan?.notes ?? '')
  const [err, setErr] = useState('')
  const knownPeople = [...new Set(d.loans.map((l) => l.person))]

  const [down, setDown] = useState(loan?.down_payment ? String(loan.down_payment) : '')
  const [downDate, setDownDate] = useState(loan?.down_payment_date ?? today())
  const financed = num(principal) - num(down)
  const suggestedEmi = financed > 0 && num(months) > 0 ? Math.ceil(financed / num(months)) : 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!person.trim()) return setErr('Who is this with?')
    if (!start) return setErr(kind === 'emi' ? 'Pick the first EMI date.' : 'Pick the date the money was given.')
    let row: Omit<Loan, 'id' | 'user_id'>
    if (kind === 'cash') {
      if (num(principal) <= 0) return setErr('Enter the amount.')
      if (due && due < start) return setErr('The due date is before the date given.')
      row = {
        person: person.trim(), phone: phone.trim(), direction: dir, kind, title: title.trim() || 'Cash',
        principal: num(principal), card: '', emi_amount: 0, installments: 0, start_date: start, due_date: due || null,
        notes: notes.trim(), closed: loan?.closed ?? false,
      }
    } else {
      const n = Math.round(num(months))
      const emiAmt = num(emi) || suggestedEmi
      if (!title.trim()) return setErr('What was bought? e.g. "Phone"')
      if (emiAmt <= 0) return setErr('Enter the monthly EMI amount.')
      if (n < 1 || n > 120) return setErr('Number of EMIs should be between 1 and 120.')
      const dp = num(down)
      if (dp < 0) return setErr('The upfront amount can’t be negative.')
      if (num(principal) > 0 && dp >= num(principal)) return setErr('The upfront amount should be less than the item price.')
      row = {
        person: person.trim(), phone: phone.trim(), direction: dir, kind, title: title.trim(),
        principal: num(principal) || emiAmt * n + dp, card: card.trim(), emi_amount: emiAmt, installments: n,
        start_date: start, due_date: null, notes: notes.trim(), closed: loan?.closed ?? false,
        down_payment: dp, down_payment_date: dp > 0 ? downDate || today() : null,
      }
    }
    if (loan) {
      await d.update('loans', loan.id, row)
      onClose()
    } else {
      const saved = await d.add('loans', row)
      onClose()
      onSaved?.(saved.id)
    }
  }

  const lent = dir === 'lent'
  return (
    <Modal title={loan ? 'Edit entry' : 'New lending entry'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Seg
          full
          value={dir}
          onChange={setDir}
          options={[
            { value: 'lent', label: 'I gave / they owe me' },
            { value: 'borrowed', label: 'I took / I owe' },
          ]}
        />
        <Seg
          full
          value={kind}
          onChange={setKind}
          options={[
            { value: 'cash', label: 'Cash / UPI loan' },
            { value: 'emi', label: lent ? 'EMI on my card' : 'EMI on their card' },
          ]}
        />
        <div className="form-row">
          <Field label={lent ? 'Friend’s name' : 'Lender’s name'}>
            <input className="input" list="people" value={person} onChange={(e) => setPerson(e.target.value)} autoFocus={!loan} />
            <datalist id="people">
              {knownPeople.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="WhatsApp number" hint="optional">
            <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          </Field>
        </div>

        {kind === 'cash' ? (
          <>
            <div className="form-row">
              <Field label="Amount">
                <input className="input num" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
              </Field>
              <Field label="Reason" hint="optional">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cash" />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Date given">
                <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Pay back by" hint="optional">
                <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div className="form-row">
              <Field label="Item bought">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Phone" />
              </Field>
              <Field label="Card used" hint="optional">
                <input className="input" value={card} onChange={(e) => setCard(e.target.value)} placeholder="e.g. SBI Card" />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Item price" hint="optional">
                <input className="input num" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
              </Field>
              <Field label="Number of EMIs">
                <input className="input num" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="e.g. 6" />
              </Field>
            </div>
            <div className="form-row">
              <Field label={lent ? 'Paid upfront by them' : 'Paid upfront by me'} hint="optional">
                <input className="input num" inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Upfront paid on">
                <input className="input" type="date" value={downDate} disabled={!num(down)} onChange={(e) => setDownDate(e.target.value)} />
              </Field>
            </div>
            {num(down) > 0 && num(principal) > 0 && financed > 0 && (
              <div className="muted small">
                {money(num(down))} paid upfront, so {money(financed)} goes on EMI.
              </div>
            )}
            <div className="form-row">
              <Field label="EMI per month" hint={suggestedEmi && !emi ? `${money(suggestedEmi)} if left blank` : undefined}>
                <input className="input num" inputMode="decimal" value={emi} onChange={(e) => setEmi(e.target.value)} placeholder={suggestedEmi ? String(suggestedEmi) : ''} />
              </Field>
              <Field label="First EMI due on">
                <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
            </div>
            <div className="muted small">Include interest or processing fees in the EMI amount if your card charges them.</div>
          </>
        )}
        <Field label="Notes" hint="optional">
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {err && <div className="alert danger">{err}</div>}
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
