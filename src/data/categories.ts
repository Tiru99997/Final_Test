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
    'Living Expenses': '#F59E0B',
    'Rental': '#DC2626',
    'Travel': '#8B5CF6',
    'Entertainment': '#EC4899',
    'Medical': '#EF4444',
    'Personal Development': '#10B981',
    'Shopping': '#3B82F6',
    'Charity': '#A855F7',
    'Savings': '#059669',
    'Investments': '#047857',
    'Other': '#6B7280',
    'Income': '#22C55E',
    'Rental Income': '#16A34A',
    'Investment Income': '#059669',
    'Other Income': '#10B981'
  };
  return colors[category] || '#6B7280';
};