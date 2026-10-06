import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '../lib/data'
import { fmtDate, fmtMonth, monthKey, money, parseDate, shiftMonth, today } from '../lib/format'
import { STATUS_LABEL, schedule, summarize, type InstallmentStatus } from '../lib/loans'
import { BackButton, Empty, Progress, Seg, initials } from '../components/ui'
import { statusBadge } from './Lending'
import type { LoanDirection } from '../lib/types'

// Chart colours are theme tokens (see index.css); the status set was checked for colour-blind separation.
const C = {
  paid: 'var(--c-paid)',
  overdue: 'var(--c-overdue)',
  pending: 'var(--c-neutral)',
  due: 'var(--c-due)',
  line: 'var(--primary)',
}
const STATUS_COLOR: Partial<Record<InstallmentStatus, string>> = {
  early: 'var(--c-paid)',
  'on-time': 'var(--c-ontime)',
  late: 'var(--c-late)',
  partial: 'var(--c-partial)',
  overdue: 'var(--c-overdue)',
}
const tip = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }
const axis = { fill: 'var(--muted)', fontSize: 12 }
const compact = (v: number) =>
  v >= 1e7 ? `${+(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}k` : String(v)
const legendText = (v: string) => <span style={{ color: 'var(--text)' }}>{v}</span>
const shortMonth = (k: string) => parseDate(k + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })

export default function Person() {
  const { name = '' } = useParams()
  const person = decodeURIComponent(name)
  const d = useData()
  const nav = useNavigate()
  const all = d.loans.filter((l) => l.person === person)
  const hasLent = all.some((l) => l.direction === 'lent')
  const hasBorrowed = all.some((l) => l.direction === 'borrowed')
  const [dirPick, setDir] = useState<LoanDirection>(hasLent ? 'lent' : 'borrowed')
  const dir = hasLent && hasBorrowed ? dirPick : hasLent ? 'lent' : 'borrowed'

  if (all.length === 0)
    return (
      <div className="card">
        <Empty icon="users">
          No entries for this person. <Link to="/lending">Back to Lending</Link>
        </Empty>
      </div>
    )

  const now = today()
  const loans = all.filter((l) => l.direction === dir)
  const rows = loans.map((l) => ({ l, s: summarize(l, d.loan_payments) }))
  const lent = dir === 'lent'
  const total = rows.reduce((a, x) => a + x.s.total, 0)
  const paid = rows.reduce((a, x) => a + x.s.paid, 0)
  const outstanding = rows.filter((x) => !x.l.closed).reduce((a, x) => a + x.s.outstanding, 0)
  const overdue = rows.filter((x) => !x.l.closed).reduce((a, x) => a + x.s.overdueAmount, 0)
  const phone = all.find((l) => l.phone)?.phone ?? ''

  // Chart 1: each entry split into paid / overdue / not yet due.
  const byEntry = rows.map(({ l, s }) => ({
    id: l.id,
    name: l.title.length > 16 ? l.title.slice(0, 15) + '…' : l.title,
    Paid: s.paid,
    Overdue: l.closed ? 0 : s.overdueAmount,
    'Not due yet': l.closed ? 0 : Math.max(0, s.outstanding - s.overdueAmount),
  }))

  // Payment events (including upfront amounts) and amounts falling due, by month.
  const events: { date: string; amount: number; loanId: string; label: string; no: number | null }[] = []
  const dues: { date: string; amount: number }[] = []
  for (const l of loans) {
    const down = l.kind === 'emi' ? Number(l.down_payment) || 0 : 0
    if (down > 0) {
      const dd = l.down_payment_date || l.start_date
      events.push({ date: dd, amount: down, loanId: l.id, label: 'Upfront', no: null })
      dues.push({ date: dd, amount: down })
    }
    if (l.kind === 'emi') for (const i of schedule(l, d.loan_payments)) dues.push({ date: i.due, amount: i.amount })
    else dues.push({ date: l.due_date || l.start_date, amount: l.principal })
  }
  for (const p of d.loan_payments)
    if (loans.some((l) => l.id === p.loan_id))
      events.push({ date: p.paid_on, amount: p.amount, loanId: p.loan_id, label: p.installment_no ? `EMI #${p.installment_no}` : 'Repayment', no: p.installment_no })

  const firstMonth = [...loans.map((l) => monthKey(l.start_date < (l.down_payment_date || l.start_date) ? l.start_date : l.down_payment_date || l.start_date)), ...events.map((e) => monthKey(e.date))].sort()[0] ?? monthKey()
  const lastDue = dues.map((x) => monthKey(x.date)).sort().pop() ?? monthKey()
  let endMonth = lastDue > monthKey() ? lastDue : monthKey()
  const months: string[] = []
  for (let k = firstMonth; k <= endMonth && months.length < 36; k = shiftMonth(k, 1)) months.push(k)
  if (months.length === 36) endMonth = months[35]

  const monthly = months.map((k) => ({
    key: k,
    month: shortMonth(k),
    Due: dues.filter((x) => x.date.startsWith(k)).reduce((a, x) => a + x.amount, 0),
    Paid: events.filter((x) => x.date.startsWith(k)).reduce((a, x) => a + x.amount, 0),
  }))

  // Balance still owed at the end of each month up to now.
  const nowKey = monthKey()
  const startOf = (l: (typeof loans)[number]) =>
    l.kind === 'emi' && Number(l.down_payment) > 0 && l.down_payment_date && l.down_payment_date < l.start_date ? l.down_payment_date : l.start_date
  const balance = months
    .filter((k) => k <= nowKey)
    .map((k) => {
      const given = rows.filter((x) => startOf(x.l).slice(0, 7) <= k).reduce((a, x) => a + x.s.total, 0)
      const back = events.filter((e) => e.date <= now && e.date.slice(0, 7) <= k).reduce((a, e) => a + e.amount, 0)
      return { month: shortMonth(k), Balance: Math.max(0, given - back) }
    })

  // Punctuality across all EMIs.
  const counts = new Map<InstallmentStatus, number>()
  for (const l of loans.filter((l) => l.kind === 'emi'))
    for (const i of schedule(l, d.loan_payments)) counts.set(i.status, (counts.get(i.status) ?? 0) + 1)
  const punct = (['early', 'on-time', 'late', 'partial', 'overdue'] as InstallmentStatus[])
    .filter((k) => counts.get(k))
    .map((k) => ({ key: k, name: STATUS_LABEL[k], value: counts.get(k)! }))
  const settledCount = punct.filter((p) => p.key === 'early' || p.key === 'on-time' || p.key === 'late').reduce((a, p) => a + p.value, 0)
  const onTimeShare = settledCount ? Math.round(((counts.get('early') ?? 0) + (counts.get('on-time') ?? 0)) / settledCount * 100) : null

  const history = [...events].sort((a, b) => b.date.localeCompare(a.date))
  const titleOf = (id: string) => loans.find((l) => l.id === id)?.title ?? ''

  return (
    <div className="stack">
        <div className="page-head detail-head" style={{ marginBottom: 0 }}>
          <div className="row grow" style={{ minWidth: 0 }}>
            <BackButton fallback="/lending" label="Lending & EMIs" />
            <div className="avatar hide-mobile">{initials(person)}</div>
            <div className="grow" style={{ minWidth: 0 }}>
              <h1 className="ellipsis">{person}</h1>
              <div className="muted small">
                {all.length} {all.length === 1 ? 'entry' : 'entries'}
                {phone ? ` · ${phone}` : ''}
              </div>
            </div>
          </div>
        </div>
      {hasLent && hasBorrowed && (
        <Seg
          full
          value={dir}
          onChange={setDir}
          options={[
            { value: 'lent', label: 'They owe me' },
            { value: 'borrowed', label: 'I owe them' },
          ]}
        />
      )}

      <div className="grid grid-4 stats">
        <div className="card stat">
          <div className="label">{lent ? 'Total lent' : 'Total borrowed'}</div>
          <div className="value">{money(total)}</div>
        </div>
        <div className="card stat">
          <div className="label">{lent ? 'Received back' : 'Paid back'}</div>
          <div className="value income">{money(paid)}</div>
        </div>
        <div className="card stat">
          <div className="label">Still due</div>
          <div className="value">{money(outstanding)}</div>
        </div>
        <div className="card stat">
          <div className="label">Overdue</div>
          <div className={'value ' + (overdue > 0 ? 'danger-text' : '')}>{money(overdue)}</div>
        </div>
      </div>
      <div className="card" style={{ paddingBlock: 12 }}>
        <div className="row between small" style={{ marginBottom: 6 }}>
          <span>
            <b className="num">{total ? Math.round((paid / total) * 100) : 0}%</b> {lent ? 'paid back so far' : 'repaid so far'}
          </span>
          {onTimeShare !== null && <span className="muted">{onTimeShare}% of paid EMIs were on time or early</span>}
        </div>
        <Progress value={paid} max={total} warnAt={2} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Each entry</h2>
          <p className="muted small" style={{ margin: '2px 0 8px' }}>How much of every item or loan is paid, overdue, or not due yet</p>
          <div style={{ height: Math.max(120, byEntry.length * 52 + 60) }}>
            <ResponsiveContainer>
              <BarChart data={byEntry} layout="vertical" margin={{ left: 4, right: 12 }} barCategoryGap={14}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tickFormatter={compact} tick={axis} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={tip} cursor={{ fill: 'var(--surface-2)' }} />
                <Legend wrapperStyle={{ fontSize: 13 }} formatter={legendText} />
                <Bar isAnimationActive={false} dataKey="Paid" stackId="a" fill={C.paid} stroke="var(--surface)" strokeWidth={2} />
                <Bar isAnimationActive={false} dataKey="Overdue" stackId="a" fill={C.overdue} stroke="var(--surface)" strokeWidth={2} />
                <Bar isAnimationActive={false} dataKey="Not due yet" stackId="a" fill={C.pending} stroke="var(--surface)" strokeWidth={2} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Payment record</h2>
          <p className="muted small" style={{ margin: '2px 0 8px' }}>Every EMI so far, by how it was paid</p>
          {punct.length === 0 ? (
            <div className="muted small" style={{ padding: '24px 0' }}>
              No EMIs for this person. Cash loans are shown in the monthly chart below.
            </div>
          ) : (
            <div className="row wrap" style={{ alignItems: 'center' }}>
              <div style={{ width: 170, height: 170 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={punct} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
                      {punct.map((p) => (
                        <Cell key={p.key} fill={STATUS_COLOR[p.key]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tip} formatter={(v) => `${v} EMI${Number(v) === 1 ? '' : 's'}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="list grow" style={{ minWidth: 150 }}>
                {punct.map((p) => (
                  <li key={p.key} style={{ padding: '7px 2px' }}>
                    <span className="dot" style={{ background: STATUS_COLOR[p.key] }} />
                    <span className="grow">{p.name}</span>
                    <b className="num">{p.value}</b>
                  </li>
                ))}
                {(counts.get('upcoming') ?? 0) + (counts.get('due-soon') ?? 0) > 0 && (
                  <li style={{ padding: '7px 2px' }}>
                    <span className="dot" style={{ background: 'var(--c-neutral)' }} />
                    <span className="grow muted">Not due yet</span>
                    <b className="num muted">{(counts.get('upcoming') ?? 0) + (counts.get('due-soon') ?? 0)}</b>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Month by month</h2>
        <p className="muted small" style={{ margin: '2px 0 8px' }}>
          What was due each month against what was actually paid, {fmtMonth(months[0])} to {fmtMonth(months[months.length - 1])}
        </p>
        <div className="table-wrap">
          <div style={{ height: 250, minWidth: Math.max(300, months.length * 58) }}>
            <ResponsiveContainer>
              <BarChart data={monthly} margin={{ left: -8, right: 6 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} interval={0} />
                <YAxis tickFormatter={compact} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={tip} cursor={{ fill: 'var(--surface-2)' }} />
                <Legend wrapperStyle={{ fontSize: 13 }} formatter={legendText} />
                <Bar isAnimationActive={false} dataKey="Due" fill={C.due} radius={[4, 4, 0, 0]} />
                <Bar isAnimationActive={false} dataKey="Paid" fill={C.paid} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {balance.length > 1 && (
        <div className="card">
          <h2>{lent ? 'What they owe you over time' : 'What you owe over time'}</h2>
          <p className="muted small" style={{ margin: '2px 0 8px' }}>Balance at the end of each month</p>
          <div style={{ height: 210 }}>
            <ResponsiveContainer>
              <AreaChart data={balance} margin={{ left: -8, right: 10, top: 6 }}>
                <defs>
                  <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compact} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => money(Number(v))} contentStyle={tip} />
                <Area isAnimationActive={false} type="monotone" dataKey="Balance" stroke={C.line} strokeWidth={2} fill="url(#balFill)" dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Entries</h2>
        <ul className="list">
          {rows.map(({ l, s }) => (
            <li key={l.id} className="clickable" onClick={() => nav(`/lending/${l.id}`)}>
              <div className="grow">
                <div className="row" style={{ gap: 8 }}>
                  <span className="title">{l.title}</span>
                  {statusBadge(s)}
                </div>
                <div className="muted small" style={{ margin: '2px 0 6px' }}>
                  {l.kind === 'emi'
                    ? `${Number(l.down_payment) > 0 ? `${money(Number(l.down_payment))} upfront + ` : ''}EMI ${money(l.emi_amount)} × ${l.installments}${l.card ? ` · ${l.card}` : ''}`
                    : `Given ${fmtDate(l.start_date)}${l.due_date ? ` · due ${fmtDate(l.due_date)}` : ''}`}
                </div>
                <Progress value={s.paid} max={s.total} warnAt={2} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontWeight: 650 }}>{money(s.outstanding)}</div>
                <div className="muted small">of {money(s.total)}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 6 }}>All payments</h2>
        {history.length === 0 ? (
          <div className="muted small">No payments recorded yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>For</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                    <td>
                      {titleOf(e.loanId)} <span className="muted small">· {e.label}</span>
                    </td>
                    <td className="r num income">{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
