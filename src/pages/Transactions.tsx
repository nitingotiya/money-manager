import { useMemo, useRef, useState } from 'react'
import { useData } from '../lib/data'
import { inMonth, totals } from '../lib/calc'
import { fmtDate, monthKey, money, num, parseDate } from '../lib/format'
import { downloadFile, parseCSV, toCSV } from '../lib/csv'
import { Empty, MonthPicker, Seg } from '../components/ui'
import { Icon } from '../components/icons'
import { useUI } from '../App'
import { PAYMENT_MODES, type TxType } from '../lib/types'

export default function Transactions() {
  const d = useData()
  const { openTx } = useUI()
  const [month, setMonth] = useState(monthKey())
  const [type, setType] = useState<'all' | TxType>('all')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [info, setInfo] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const catById = useMemo(() => new Map(d.categories.map((c) => [c.id, c])), [d.categories])
  const rows = inMonth(d.transactions, month)
    .filter((t) => type === 'all' || t.type === type)
    .filter((t) => !cat || t.category_id === cat)
    .filter((t) => {
      if (!q.trim()) return true
      const s = q.toLowerCase()
      return t.note.toLowerCase().includes(s) || (catById.get(t.category_id ?? '')?.name.toLowerCase().includes(s) ?? false)
    })
    .sort((a, b) => b.date.localeCompare(a.date))
  const t = totals(rows)

  const groups = new Map<string, typeof rows>()
  for (const r of rows) groups.set(r.date, [...(groups.get(r.date) ?? []), r])

  function exportCSV() {
    const all = [...d.transactions].sort((a, b) => a.date.localeCompare(b.date))
    const csv = toCSV([
      ['date', 'type', 'amount', 'category', 'note', 'mode'],
      ...all.map((t) => [t.date, t.type, t.amount, catById.get(t.category_id ?? '')?.name ?? '', t.note, t.mode]),
    ])
    downloadFile(`transactions-${monthKey()}.csv`, csv)
  }

  async function importCSV(file: File) {
    const rows = parseCSV(await file.text())
    if (rows.length < 2) return setInfo('That file has no rows to import.')
    const head = rows[0].map((h) => h.trim().toLowerCase())
    const col = (n: string) => head.indexOf(n)
    const [iDate, iType, iAmt, iCat, iNote, iMode] = ['date', 'type', 'amount', 'category', 'note', 'mode'].map(col)
    if (iDate < 0 || iAmt < 0) return setInfo('The CSV needs at least "date" and "amount" columns. Export first to see the format.')
    let ok = 0
    let skipped = 0
    for (const r of rows.slice(1)) {
      const date = normaliseDate(r[iDate] ?? '')
      let amount = num(r[iAmt] ?? '')
      let tp: TxType = (r[iType] ?? '').trim().toLowerCase() === 'income' ? 'income' : 'expense'
      if (iType < 0 && amount < 0) tp = 'expense'
      else if (iType < 0 && amount > 0) tp = 'income'
      amount = Math.abs(amount)
      if (!date || !amount) {
        skipped++
        continue
      }
      const cname = (r[iCat] ?? '').trim().toLowerCase()
      const c = d.categories.find((c) => c.type === tp && c.name.toLowerCase() === cname)
      const m = PAYMENT_MODES.find((m) => m.toLowerCase() === (r[iMode] ?? '').trim().toLowerCase()) ?? 'Other'
      await d.add('transactions', { type: tp, amount, category_id: c?.id ?? null, date, note: (r[iNote] ?? '').trim(), mode: m })
      ok++
    }
    setInfo(`Imported ${ok} transaction${ok === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} row${skipped === 1 ? '' : 's'} with a missing date or amount` : ''}.`)
  }

  return (
    <div>
      <div className="page-head">
        <h1>Transactions</h1>
        <div className="row wrap">
          <button className="btn sm" onClick={() => fileRef.current?.click()} aria-label="Import CSV">
            <Icon name="upload" /> <span className="hide-mobile">Import CSV</span>
          </button>
          <button className="btn sm" onClick={exportCSV} disabled={!d.transactions.length} aria-label="Export CSV">
            <Icon name="download" /> <span className="hide-mobile">Export CSV</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importCSV(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>
      {info && (
        <div className="alert info" style={{ marginBottom: 14 }}>
          <span className="grow">{info}</span>
          <button className="icon-btn" onClick={() => setInfo('')} aria-label="Dismiss">
            <Icon name="x" />
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row wrap between">
          <MonthPicker value={month} onChange={setMonth} />
          <Seg
            value={type}
            onChange={setType}
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
          />
        </div>
        <div className="row wrap" style={{ marginTop: 12 }}>
          <input className="input grow" placeholder="Search notes or categories" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 180 }} />
          <select className="input" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category filter">
            <option value="">All categories</option>
            {d.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="row wrap small" style={{ marginTop: 12, gap: 18 }}>
          <span>
            In <b className="income num">{money(t.income)}</b>
          </span>
          <span>
            Out <b className="expense num">{money(t.expense)}</b>
          </span>
          <span>
            Net <b className="num">{money(t.net)}</b>
          </span>
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <Empty icon="list">
            Nothing here for this month.
            <div style={{ marginTop: 10 }}>
              <button className="btn primary" onClick={() => openTx()}>
                Add transaction
              </button>
            </div>
          </Empty>
        ) : (
          [...groups].map(([date, txs]) => (
            <div key={date}>
              <div className="day-head">{fmtDate(date)}</div>
              <ul className="list">
                {txs.map((tx) => {
                  const c = catById.get(tx.category_id ?? '')
                  return (
                    <li key={tx.id} className="clickable" onClick={() => openTx(tx)}>
                      <span className="dot" style={{ background: c?.color ?? '#adb5bd' }} />
                      <div className="grow">
                        <div className="title">{tx.note || c?.name || 'Uncategorised'}</div>
                        <div className="muted small">
                          {c?.name ?? 'Uncategorised'} · {tx.mode}
                        </div>
                      </div>
                      <div className={'num ' + tx.type}>{money(tx.type === 'income' ? tx.amount : -tx.amount, { sign: true })}</div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY (the common formats in Indian bank statements). */
function normaliseDate(s: string) {
  s = s.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3]
    const iso = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return isNaN(parseDate(iso).getTime()) ? '' : iso
  }
  return ''
}
