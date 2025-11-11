export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  category: string;
  amount: number;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export type LoanType = 'given' | 'taken';

export interface LoanPayment {
  id: string;
  date: string;
  amount: number;
}

export interface Loan {
  id: string;
  type: LoanType;
  person: string; // Borrower or Lender
  amount: number;
  date: string; // Date given or taken
  dueDate: string;
  payments: LoanPayment[];
  status: 'pending' | 'partially_paid' | 'completed' | 'overdue';
}

export type PlannerFrequency = 'one-time' | 'monthly' | 'quarterly' | 'yearly';
export type PlannerItemType = 'income' | 'expense';

export interface SalaryCalculationDetails {
  base: string;
  days: string;
  unpaid: string;
  totalHours: string;
  kpi: string;
}

export interface FutureTransaction {
  id: string;
  type: PlannerItemType;
  description: string;
  amount: number;
  frequency: PlannerFrequency;
  startDate: string;
  endDate?: string;
  calculationDetails?: SalaryCalculationDetails;
  category?: string;
}

export interface MonthlyBudget {
  [monthKey: string]: { // e.g., "2023-10"
    startingBalance: number;
    income: number;
    expenses: number;
    endingBalance: number;
  };
}

export interface AIInsight {
  type: 'positive' | 'info' | 'warning';
  message: string;
  icon: string;
}

export interface AIAnalysis {
  healthScore: number;
  savingsRate: number;
  insights: AIInsight[];
  spendingPrediction: number;
}
