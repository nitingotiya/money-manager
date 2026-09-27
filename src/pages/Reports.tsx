import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../lib/data'
import { inMonth, spentByCategory, totals } from '../lib/calc'
import { fmtMonth, monthKey, money, parseDate, shiftMonth } from '../lib/format'
import { Empty, MonthPicker } from '../components/ui'

export default function Reports() {
  const d = useData()
  const [month, setMonth] = useState(monthKey())
  const txs = inMonth(d.transactions, month)
  const t = totals(txs)
  const byCat = [...spentByCategory(txs)]
    .map(([id, value]) => {
      const c = d.categories.find((c) => c.id === id)
      return { name: c?.name ?? 'Uncategorised', color: c?.color ?? '#adb5bd', value }
    })
    .sort((a, b) => b.value - a.value)

  const trend = Array.from({ length: 6 }, (_, i) => {
    const k = shiftMonth(month, i - 5)
    const tt = totals(inMonth(d.transactions, k))
    return {
      month: parseDate(k + '-01').toLocaleDateString('en-IN', { month: 'short' }),
      Income: tt.income,
      Expense: tt.expense,
    }
  })
  const prev = totals(inMonth(d.transactions, shiftMonth(month, -1)))
  const change = prev.expense > 0 ? ((t.expense - prev.expense) / prev.expense) * 100 : null
  const savingsRate = t.income > 0 ? (t.net / t.income) * 100 : null
  const daysInMonth = new Date(+month.slice(0, 4), +month.slice(5), 0).getDate()
  const daysSoFar = month === monthKey() ? new Date().getDate() : daysInMonth
  const byMode = new Map<string, number>()
  for (const x of txs) if (x.type === 'expense') byMode.set(x.mode, (byMode.get(x.mode) ?? 0) + x.amount)

  const axisColor = 'var(--muted)'
  const compact = (v: number) => (v >= 1e7 ? `${+(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}k` : String(v))

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1>Reports</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="grid grid-3 stats">
        <div className="card stat">
          <div className="label">Spent in {fmtMonth(month)}</div>
          <div className="value">{money(t.expense)}</div>
          <div className="small muted">
            {change === null ? 'No data for last month' : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(0)}% vs last month`}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Savings rate</div>
          <div className="value">{savingsRate === null ? '—' : `${savingsRate.toFixed(0)}%`}</div>
          <div className="small muted">Share of income not spent</div>
        </div>
        <div className="card stat">
          <div className="label">Average daily spend</div>
          <div className="value">{money(Math.round(t.expense / Math.max(1, daysSoFar)))}</div>
          <div className="small muted">Over {daysSoFar} days</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>Where the money went</h2>
          {byCat.length === 0 ? (
            <Empty icon="chart">No expenses this month.</Empty>
          ) : (
            <>
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={1} stroke="var(--surface)">
                      {byCat.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="list">
                {byCat.map((c) => (
                  <li key={c.name}>
                    <span className="dot" style={{ background: c.color }} />
                    <span className="grow">{c.name}</span>
                    <span className="muted small num">{((c.value / t.expense) * 100).toFixed(0)}%</span>
                    <span className="num" style={{ minWidth: 80, textAlign: 'right' }}>
                      {money(c.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <h2 style={{ marginBottom: 8 }}>Last 6 months</h2>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={trend} margin={{ left: -10, right: 4 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compact} tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => money(Number(v))}
                    cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="Income" fill="var(--income)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="var(--expense)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h2 style={{ marginBottom: 8 }}>Spending by payment method</h2>
            {byMode.size === 0 ? (
              <div className="muted small">No expenses this month.</div>
            ) : (
              <ul className="list">
                {[...byMode]
                  .sort((a, b) => b[1] - a[1])
                  .map(([m, v]) => (
                    <li key={m}>
                      <span className="grow">{m}</span>
                      <span className="num">{money(v)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
