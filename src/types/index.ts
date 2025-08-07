export interface Transaction {
  id: string;
  date: Date;
  category: string;
  subcategory: string;
  amount: number;
  description?: string;
  type: 'income' | 'expense';
}

export interface Budget {
  category: string;
  amount: number;
  month: string; // Format: YYYY-MM
}

export interface CategoryStructure {
  [key: string]: string[];
}

export interface SavingsAccount {
  name: string;
  amount: number;
  target?: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  budgetedIncome: number;
  budgetedExpenses: number;
}