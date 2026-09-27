import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { billState, inMonth, spentByCategory, totals } from '../lib/calc'
import { fmtDate, fmtMonth, monthKey, money } from '../lib/format'
import { summarize } from '../lib/loans'
import { Empty, Progress } from '../components/ui'
import { Icon } from '../components/icons'
import { useUI } from '../App'

export default function Dashboard() {
  const d = useData()
  const nav = useNavigate()
  const { openTx } = useUI()
  const key = monthKey()
  const month = inMonth(d.transactions, key)
  const t = totals(month)
  const spent = spentByCategory(month)
  const catName = (id: string | null) => d.categories.find((c) => c.id === id)?.name ?? 'Uncategorised'
  const catColor = (id: string | null) => d.categories.find((c) => c.id === id)?.color ?? '#adb5bd'

  const budgetAlerts = d.budgets
    .map((b) => ({ b, used: spent.get(b.category_id) ?? 0 }))
    .filter(({ b, used }) => b.amount > 0 && used / b.amount >= 0.8)
    .sort((a, b) => b.used / b.b.amount - a.used / a.b.amount)

  const bills = d.bills
    .map((b) => ({ b, ...billState(b) }))
    .filter((x) => x.state === 'overdue' || x.state === 'due-soon')
    .sort((a, b) => a.due.localeCompare(b.due))

  const loans = d.loans.filter((l) => !l.closed).map((l) => ({ l, s: summarize(l, d.loan_payments) }))
  const owedToMe = loans.filter((x) => x.l.direction === 'lent').reduce((s, x) => s + x.s.outstanding, 0)
  const iOwe = loans.filter((x) => x.l.direction === 'borrowed').reduce((s, x) => s + x.s.outstanding, 0)
  const overdueLoans = loans.filter((x) => x.s.status === 'overdue')

  const recent = [...d.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  const hasAnything = d.transactions.length + d.loans.length + d.goals.length + d.bills.length > 0

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>{d.settings.display_name ? `Hi, ${d.settings.display_name}` : 'Overview'}</h1>
          <div className="muted small">{fmtMonth(key)}</div>
        </div>
        <button className="btn primary hide-mobile" onClick={() => openTx()}>
          <Icon name="plus" /> Add transaction
        </button>
      </div>

      {!hasAnything && (
        <div className="card stack">
          <h2>Welcome</h2>
          <p className="muted" style={{ margin: 0 }}>
            Start by adding a transaction, or load some sample data to look around first. Sample entries are marked and you can delete them any time.
          </p>
          <div className="row wrap">
            <button className="btn primary" onClick={() => openTx()}>
              Add first transaction
            </button>
            <button className="btn" onClick={() => d.loadSample()}>
              Load sample data
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-3 stats">
        <div className="card stat">
          <div className="label">Income this month</div>
          <div className="value income">{money(t.income)}</div>
        </div>
        <div className="card stat">
          <div className="label">Spent this month</div>
          <div className="value expense">{money(t.expense)}</div>
        </div>
        <div className="card stat">
          <div className="label">Left over</div>
          <div className={'value ' + (t.net < 0 ? 'danger-text' : '')}>{money(t.net)}</div>
        </div>
      </div>

      {(overdueLoans.length > 0 || bills.some((b) => b.state === 'overdue')) && (
        <div className="stack" style={{ gap: 8 }}>
          {overdueLoans.map(({ l, s }) => (
            <Link key={l.id} to={`/lending/${l.id}`} className="alert danger" style={{ textDecoration: 'none' }}>
              <Icon name="alert" />
              <span className="grow">
                {l.direction === 'lent' ? (
                  <>
                    <b>{l.person}</b> is behind on "{l.title}": {money(s.overdueAmount)} overdue
                  </>
                ) : (
                  <>
                    You're behind on paying <b>{l.person}</b>: {money(s.overdueAmount)} overdue
                  </>
                )}
              </span>
              <Icon name="right" />
            </Link>
          ))}
          {bills
            .filter((b) => b.state === 'overdue')
            .map(({ b, due }) => (
              <Link key={b.id} to="/bills" className="alert warn" style={{ textDecoration: 'none' }}>
                <Icon name="calendar" />
                <span className="grow">
                  <b>{b.name}</b> ({money(b.amount)}) was due {fmtDate(due)}
                </span>
                <Icon name="right" />
              </Link>
            ))}
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Lending & EMIs</h2>
            <Link to="/lending" className="small">
              View all
            </Link>
          </div>
          <div className="grid grid-2 stats2" style={{ gap: 10 }}>
            <div>
              <div className="muted small">Friends owe you</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 650 }}>{money(owedToMe)}</div>
            </div>
            <div>
              <div className="muted small">You owe</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 650 }}>{money(iOwe)}</div>
            </div>
          </div>
          {loans.length > 0 && (
            <ul className="list" style={{ marginTop: 8 }}>
              {loans
                .filter((x) => x.s.nextDue)
                .sort((a, b) => a.s.nextDue!.localeCompare(b.s.nextDue!))
                .slice(0, 3)
                .map(({ l, s }) => (
                  <li key={l.id} className="clickable" onClick={() => nav(`/lending/${l.id}`)}>
                    <div className="grow">
                      <div className="title">{l.person}</div>
                      <div className="muted small">
                        {l.title} · next {fmtDate(s.nextDue)}
                      </div>
                    </div>
                    <div className="num">{money(s.nextAmount)}</div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Upcoming bills</h2>
            <Link to="/bills" className="small">
              View all
            </Link>
          </div>
          {bills.length === 0 ? (
            <div className="muted small">Nothing due in the next 5 days.</div>
          ) : (
            <ul className="list">
              {bills.map(({ b, due, state }) => (
                <li key={b.id}>
                  <div className="grow">
                    <div className="title">{b.name}</div>
                    <div className="muted small">Due {fmtDate(due)}</div>
                  </div>
                  <span className={'badge ' + (state === 'overdue' ? 'danger' : 'warn')}>{state === 'overdue' ? 'Overdue' : 'Due soon'}</span>
                  <div className="num">{money(b.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Budget watch</h2>
            <Link to="/budgets" className="small">
              Budgets
            </Link>
          </div>
          {d.budgets.length === 0 ? (
            <div className="muted small">
              No budgets yet. <Link to="/budgets">Set a monthly limit</Link> for a category to get warnings here.
            </div>
          ) : budgetAlerts.length === 0 ? (
            <div className="muted small">All categories are under 80% of their limit.</div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {budgetAlerts.map(({ b, used }) => (
                <div key={b.id}>
                  <div className="row between small" style={{ marginBottom: 4 }}>
                    <span>{catName(b.category_id)}</span>
                    <span className={used > b.amount ? 'danger-text num' : 'num'}>
                      {money(used)} / {money(b.amount)}
                    </span>
                  </div>
                  <Progress value={used} max={b.amount} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Recent</h2>
            <Link to="/transactions" className="small">
              All transactions
            </Link>
          </div>
          {recent.length === 0 ? (
            <Empty icon="list">No transactions yet.</Empty>
          ) : (
            <ul className="list">
              {recent.map((tx) => (
                <li key={tx.id} className="clickable" onClick={() => openTx(tx)}>
                  <span className="dot" style={{ background: catColor(tx.category_id) }} />
                  <div className="grow">
                    <div className="title">{tx.note || catName(tx.category_id)}</div>
                    <div className="muted small">
                      {catName(tx.category_id)} · {fmtDate(tx.date)}
                    </div>
                  </div>
                  <div className={'num ' + tx.type}>{money(tx.type === 'income' ? tx.amount : -tx.amount, { sign: true })}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
