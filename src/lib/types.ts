export type TxType = 'expense' | 'income'

export interface Category {
  id: string
  user_id?: string
  name: string
  type: TxType
  color: string
}

export interface Transaction {
  id: string
  user_id?: string
  type: TxType
  amount: number
  category_id: string | null
  date: string // YYYY-MM-DD
  note: string
  mode: string // UPI, Cash, Card, Bank, Other
}

export interface Budget {
  id: string
  user_id?: string
  category_id: string
  amount: number // monthly limit
}

export interface Goal {
  id: string
  user_id?: string
  name: string
  target: number
  saved: number
  deadline: string | null
}

export interface Bill {
  id: string
  user_id?: string
  name: string
  amount: number
  due_day: number // 1-31
  category_id: string | null
  last_paid: string | null // YYYY-MM of the last month paid
}

export type LoanDirection = 'lent' | 'borrowed'
export type LoanKind = 'cash' | 'emi'

export interface Loan {
  id: string
  user_id?: string
  person: string
  phone: string
  direction: LoanDirection
  kind: LoanKind
  title: string // "Cash" or item name, e.g. "iPhone 15"
  principal: number // total amount (cash lent, or item price)
  down_payment?: number // EMI only: amount paid upfront, outside the EMIs
  down_payment_date?: string | null
  card: string // card used for EMI
  emi_amount: number
  installments: number
  start_date: string // date given (cash) or first EMI due date (emi)
  due_date: string | null // expected repayment date for cash loans
  notes: string
  closed: boolean
}

export interface LoanPayment {
  id: string
  user_id?: string
  loan_id: string
  installment_no: number | null // null for cash loans
  amount: number
  paid_on: string
  note: string
}

export interface Settings {
  id: string
  user_id?: string
  currency: string
  display_name: string
}

export interface Tables {
  categories: Category
  transactions: Transaction
  budgets: Budget
  goals: Goal
  bills: Bill
  loans: Loan
  loan_payments: LoanPayment
  settings: Settings
}

export type TableName = keyof Tables
export const TABLES: TableName[] = [
  'categories',
  'transactions',
  'budgets',
  'goals',
  'bills',
  'loans',
  'loan_payments',
  'settings',
]

export const PAYMENT_MODES = ['UPI', 'Cash', 'Card', 'Bank', 'Other']
