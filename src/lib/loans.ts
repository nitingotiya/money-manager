import { addMonths, daysBetween, today } from './format'
import type { Loan, LoanPayment } from './types'

export type InstallmentStatus = 'early' | 'on-time' | 'late' | 'partial' | 'overdue' | 'due-soon' | 'upcoming'

export interface Installment {
  no: number
  due: string
  amount: number
  paid: number
  paidOn: string | null // date of the payment that completed it (or the latest one)
  payments: LoanPayment[]
  status: InstallmentStatus
  daysOff: number // days early (negative) or late (positive) vs due date
}

export const STATUS_LABEL: Record<InstallmentStatus, string> = {
  early: 'Paid early',
  'on-time': 'Paid on time',
  late: 'Paid late',
  partial: 'Part paid',
  overdue: 'Overdue',
  'due-soon': 'Due soon',
  upcoming: 'Upcoming',
}

/** Build the month-by-month schedule for an EMI loan and match recorded payments to each installment. */
export function schedule(loan: Loan, payments: LoanPayment[], now = today()): Installment[] {
  const mine = payments.filter((p) => p.loan_id === loan.id)
  const out: Installment[] = []
  for (let i = 1; i <= loan.installments; i++) {
    const due = addMonths(loan.start_date, i - 1)
    const ps = mine.filter((p) => p.installment_no === i).sort((a, b) => a.paid_on.localeCompare(b.paid_on))
    const paid = ps.reduce((s, p) => s + p.amount, 0)
    const amount = loan.emi_amount
    let status: InstallmentStatus
    let paidOn: string | null = null
    let daysOff = 0
    if (paid >= amount - 0.5 && ps.length) {
      // The installment was complete on the date of the payment that crossed the EMI amount.
      let run = 0
      for (const p of ps) {
        run += p.amount
        if (run >= amount - 0.5) {
          paidOn = p.paid_on
          break
        }
      }
      daysOff = daysBetween(due, paidOn!)
      status = daysOff < 0 ? 'early' : daysOff === 0 ? 'on-time' : 'late'
    } else {
      paidOn = ps.length ? ps[ps.length - 1].paid_on : null
      const until = daysBetween(now, due)
      daysOff = -until
      if (until < 0) status = paid > 0 ? 'partial' : 'overdue'
      else if (paid > 0) status = 'partial'
      else status = until <= 7 ? 'due-soon' : 'upcoming'
    }
    out.push({ no: i, due, amount, paid, paidOn, payments: ps, status, daysOff })
  }
  return out
}

export interface LoanSummary {
  total: number
  paid: number
  outstanding: number
  overdueAmount: number
  overdueCount: number
  nextDue: string | null
  nextAmount: number
  status: 'settled' | 'overdue' | 'active'
  onTime: number
  early: number
  late: number
}

export function summarize(loan: Loan, payments: LoanPayment[], now = today()): LoanSummary {
  const mine = payments.filter((p) => p.loan_id === loan.id)
  const down = loan.kind === 'emi' ? Number(loan.down_payment) || 0 : 0
  const paid = mine.reduce((s, p) => s + p.amount, 0) + down
  if (loan.kind === 'emi') {
    const sch = schedule(loan, payments, now)
    const total = loan.emi_amount * loan.installments + down
    const overdue = sch.filter((s) => s.due < now && s.paid < s.amount - 0.5)
    const next = sch.find((s) => s.paid < s.amount - 0.5)
    const outstanding = Math.max(0, total - paid)
    return {
      total,
      paid,
      outstanding,
      overdueAmount: overdue.reduce((s, i) => s + (i.amount - i.paid), 0),
      overdueCount: overdue.length,
      nextDue: next?.due ?? null,
      nextAmount: next ? next.amount - next.paid : 0,
      status: loan.closed || outstanding <= 0.5 ? 'settled' : overdue.length ? 'overdue' : 'active',
      onTime: sch.filter((s) => s.status === 'on-time').length,
      early: sch.filter((s) => s.status === 'early').length,
      late: sch.filter((s) => s.status === 'late').length,
    }
  }
  const outstanding = Math.max(0, loan.principal - paid)
  const isOverdue = !!loan.due_date && loan.due_date < now && outstanding > 0.5
  return {
    total: loan.principal,
    paid,
    outstanding,
    overdueAmount: isOverdue ? outstanding : 0,
    overdueCount: isOverdue ? 1 : 0,
    nextDue: outstanding > 0.5 ? loan.due_date : null,
    nextAmount: outstanding,
    status: loan.closed || outstanding <= 0.5 ? 'settled' : isOverdue ? 'overdue' : 'active',
    onTime: 0,
    early: 0,
    late: 0,
  }
}

/** Split a lump sum over the unpaid EMIs in order. Returns the payments to create and any amount left over. */
export function spreadPayment(loan: Loan, payments: LoanPayment[], amount: number, fromNo = 1) {
  const parts: { installment_no: number; amount: number }[] = []
  let left = Math.round(amount * 100) / 100
  for (const i of schedule(loan, payments)) {
    if (i.no < fromNo || left <= 0) continue
    const due = Math.round((i.amount - i.paid) * 100) / 100
    if (due <= 0) continue
    const take = Math.min(due, left)
    parts.push({ installment_no: i.no, amount: take })
    left = Math.round((left - take) * 100) / 100
  }
  return { parts, left }
}

export function reminderText(loan: Loan, s: LoanSummary, money: (n: number) => string, fmt: (d: string) => string) {
  if (loan.kind === 'emi') {
    const what = s.overdueCount
      ? `${s.overdueCount} EMI${s.overdueCount > 1 ? 's' : ''} of ${money(s.overdueAmount)} ${s.overdueCount > 1 ? 'are' : 'is'} pending`
      : `the next EMI of ${money(s.nextAmount)} is due on ${fmt(s.nextDue!)}`
    return `Hi ${loan.person.replace(/\s*\(.*\)$/, '')}, a quick reminder for "${loan.title}": ${what}. Total remaining: ${money(s.outstanding)}. Thanks!`
  }
  const due = loan.due_date ? ` (due ${fmt(loan.due_date)})` : ''
  return `Hi ${loan.person.replace(/\s*\(.*\)$/, '')}, a quick reminder about the ${money(loan.principal)} I lent you${due}. ${money(s.outstanding)} is still pending. Thanks!`
}
