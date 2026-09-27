import { addMonths, monthKey, shiftMonth, today, uid } from './format'
import type { Category, TableName } from './types'

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food & Dining', type: 'expense', color: '#e76f51' },
  { name: 'Groceries', type: 'expense', color: '#f4a261' },
  { name: 'Transport', type: 'expense', color: '#2a9d8f' },
  { name: 'Rent', type: 'expense', color: '#264653' },
  { name: 'Bills & Utilities', type: 'expense', color: '#8d99ae' },
  { name: 'Shopping', type: 'expense', color: '#b5838d' },
  { name: 'Health', type: 'expense', color: '#e63946' },
  { name: 'Entertainment', type: 'expense', color: '#9b5de5' },
  { name: 'Education', type: 'expense', color: '#3a86ff' },
  { name: 'EMI & Loans', type: 'expense', color: '#6d597a' },
  { name: 'Other', type: 'expense', color: '#adb5bd' },
  { name: 'Salary', type: 'income', color: '#2d6a4f' },
  { name: 'Freelance', type: 'income', color: '#52b788' },
  { name: 'Interest', type: 'income', color: '#95d5b2' },
  { name: 'Other Income', type: 'income', color: '#74c69d' },
]

/** Example data for trying the app. Every name and amount here is made up. */
export function sampleData(categories: Category[]): Partial<Record<TableName, Record<string, unknown>[]>> {
  const cat = (name: string) => categories.find((c) => c.name === name)?.id ?? null
  const t = today()
  const m0 = monthKey()
  const tx: Record<string, unknown>[] = []
  const add = (month: string, day: number, type: string, amount: number, c: string, note: string, mode = 'UPI') => {
    const d = `${month}-${String(day).padStart(2, '0')}`
    if (d > t) return
    tx.push({ id: uid(), type, amount, category_id: cat(c), date: d, note, mode })
  }
  for (let i = 5; i >= 0; i--) {
    const m = shiftMonth(m0, -i)
    add(m, 1, 'income', 55000, 'Salary', 'Monthly salary', 'Bank')
    add(m, 3, 'expense', 14000, 'Rent', 'House rent', 'Bank')
    add(m, 5, 'expense', 3200 + i * 150, 'Groceries', 'Monthly groceries')
    add(m, 8, 'expense', 1450, 'Bills & Utilities', 'Electricity')
    add(m, 11, 'expense', 900 + i * 60, 'Transport', 'Metro + auto')
    add(m, 14, 'expense', 1800 - i * 90, 'Food & Dining', 'Dinner with friends', 'Card')
    add(m, 18, 'expense', 650, 'Entertainment', 'Movie')
    if (i % 2 === 0) add(m, 20, 'income', 8000, 'Freelance', 'Website project', 'Bank')
    if (i % 3 === 1) add(m, 22, 'expense', 2600, 'Shopping', 'Clothes', 'Card')
  }

  const emiLoan = uid()
  const cashLoan = uid()
  const rahulCash = uid()
  const firstDue = addMonths(m0 + '-05', -3)
  return {
    transactions: tx,
    budgets: [
      { id: uid(), category_id: cat('Food & Dining'), amount: 3000 },
      { id: uid(), category_id: cat('Groceries'), amount: 4000 },
      { id: uid(), category_id: cat('Shopping'), amount: 2500 },
      { id: uid(), category_id: cat('Transport'), amount: 1500 },
    ],
    goals: [
      { id: uid(), name: 'Emergency fund', target: 100000, saved: 42000, deadline: addMonths(t, 10) },
      { id: uid(), name: 'New laptop', target: 70000, saved: 18000, deadline: addMonths(t, 5) },
    ],
    bills: [
      { id: uid(), name: 'Mobile recharge', amount: 299, due_day: 12, category_id: cat('Bills & Utilities'), last_paid: null },
      { id: uid(), name: 'Internet', amount: 799, due_day: 25, category_id: cat('Bills & Utilities'), last_paid: null },
    ],
    loans: [
      {
        id: emiLoan, person: 'Rahul (sample)', phone: '', direction: 'lent', kind: 'emi',
        title: 'Phone on my credit card', principal: 42000, card: 'HDFC Millennia', emi_amount: 6000,
        installments: 6, start_date: firstDue, due_date: null, notes: 'No-cost EMI, 6 months', closed: false,
        down_payment: 6000, down_payment_date: addMonths(firstDue, -1),
      },
      {
        id: cashLoan, person: 'Priya (sample)', phone: '', direction: 'lent', kind: 'cash',
        title: 'Cash', principal: 5000, card: '', emi_amount: 0, installments: 0,
        start_date: addMonths(t, -1), due_date: addMonths(t, 1), notes: '', closed: false,
      },
      {
        id: rahulCash, person: 'Rahul (sample)', phone: '', direction: 'lent', kind: 'cash',
        title: 'Cash for rent', principal: 4000, card: '', emi_amount: 0, installments: 0,
        start_date: addMonths(t, -4), due_date: addMonths(t, -2), notes: '', closed: false,
      },
    ],
    loan_payments: [
      { id: uid(), loan_id: rahulCash, installment_no: null, amount: 2500, paid_on: addMonths(t, -2).slice(0, 8) + '20', note: '' },
      { id: uid(), loan_id: emiLoan, installment_no: 1, amount: 6000, paid_on: addMonths(firstDue, 0).replace(/-05$/, '-02'), note: '' },
      { id: uid(), loan_id: emiLoan, installment_no: 2, amount: 6000, paid_on: addMonths(firstDue, 1).replace(/-05$/, '-09'), note: '' },
      { id: uid(), loan_id: cashLoan, installment_no: null, amount: 2000, paid_on: t, note: 'Paid via UPI' },
    ],
  }
}
