let currency = 'INR'
export function setCurrency(c: string) {
  currency = c || 'INR'
}

export function money(n: number, opts: { sign?: boolean } = {}) {
  const locale = currency === 'INR' ? 'en-IN' : undefined
  const s = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(Math.abs(n))
  if (opts.sign && n !== 0) return (n > 0 ? '+' : '−') + s
  return n < 0 ? '−' + s : s
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today() {
  return toISODate(new Date())
}

export function monthKey(d: Date | string = new Date()) {
  if (typeof d === 'string') return d.slice(0, 7)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Add months, clamping the day to the target month's length (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(s: string, n: number) {
  const d = parseDate(s)
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, last))
  return toISODate(target)
}

export function shiftMonth(key: string, n: number) {
  return addMonths(key + '-01', n).slice(0, 7)
}

export function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return parseDate(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtMonth(key: string) {
  return parseDate(key + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

export function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function num(v: string | number) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}
