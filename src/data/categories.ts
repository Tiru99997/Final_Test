import { CategoryStructure } from '../types';

export const EXPENSE_CATEGORIES: CategoryStructure = {
  'Leisure': [
    'Clothes', 'Entertainment', 'Vacation', 'Gifts', 'Cigarette', 
    'Casino', 'Party', 'Maintenance', 'Netflix', 'Disney Plus', 
    'HBO', 'Spotify', 'AI subscriptions'
  ],
  'Dining Out': ['Restaurant', 'Coffee', 'Sandwich'],
  'Medical': [
    'Scans', 'Medical Insurance', 'Physiotherapy', 'Dental', 
    'Prescriptions', 'GP', 'Blood test', 'Hospital'
  ],
  'Personal Development': ['Courses', 'Gym'],
  'Transport': ['Taxi', 'Bus'],
  'Charity': ['Donation'],
  'Bills': ['Electricity', 'Gas', 'Water', 'Broadband', 'Bins'],
  'Savings': ['Long term saving', 'Short term saving'],
  'Investments': ['Stocks', 'Bonds', 'Commodity', 'Crypto'],
  'Living Expenses': [
    'Grocery', 'Laundry', 'Inessentials', 'Toiletries', 'Kitchen supplies'
  ]
};

export const INCOME_CATEGORIES: CategoryStructure = {
  'Fixed Income': ['Salary'],
  'Variable Income': ['Dividends', 'Casino profit']
};

export const getAllCategories = () => ({
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES
});

export const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    'Leisure': '#8B5CF6',
    'Dining Out': '#F59E0B',
    'Medical': '#EF4444',
    'Personal Development': '#10B981',
    'Transport': '#3B82F6',
    'Charity': '#EC4899',
    'Bills': '#6B7280',
    'Savings': '#059669',
    'Investments': '#047857',
    'Living Expenses': '#DC2626',
    'Fixed Income': '#22C55E',
    'Variable Income': '#16A34A'
  };
  return colors[category] || '#6B7280';
};