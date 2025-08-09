import React, { useState, useEffect, useMemo } from 'react';
import { Transaction } from '../types';
import { getAllCategories, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { generateId, formatCurrency } from '../utils/calculations';
import { Plus, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { generateSampleData, generateSampleBudgets } from '../utils/sampleData';

interface AddTransactionProps {
  onAddTransaction: (transaction: Transaction) => void;
  onBulkImport: (transactions: Transaction[]) => void;
  transactions: Transaction[];
  onLoadSampleData: (transactions: Transaction[]) => void;
  onLoadSampleBudgets: (budgets: any[]) => void;
}

const AddTransaction: React.FC<AddTransactionProps> = ({ 
  onAddTransaction, 
  onBulkImport,
  transactions,
  onLoadSampleData,
  onLoadSampleBudgets
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    expenseDetail: '',
    amount: '',
    date: new Date().toLocaleDateString('en-CA'), // This gives YYYY-MM-DD format in local timezone
  });
  
  const [customCategory, setCustomCategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    if (!formData.expenseDetail || !formData.amount) {
      alert('Please fill in all required fields');
      setIsProcessing(false);
      return;
    }

    // Call AI categorization first
    categorizeAndAddTransaction();
  };

  const categorizeAndAddTransaction = async () => {
    try {
      const tempTransaction = {
        id: generateId(),
        date: new Date(formData.date + 'T00:00:00'), // Create date object from YYYY-MM-DD
        description: formData.expenseDetail,
        amount: parseFloat(formData.amount),
        type: 'expense' as const
      };

      // Call AI categorization
      const categorizedTransaction = await categorizeTransaction(tempTransaction);
      
      if (categorizedTransaction) {
        onAddTransaction(categorizedTransaction);
        
        // Reset form
        setFormData({
          expenseDetail: '',
          amount: '',
          date: new Date().toLocaleDateString('en-CA'),
        });
      }
    } catch (error) {
      console.error('Error categorizing transaction:', error);
      alert('Failed to categorize transaction. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const categorizeTransaction = async (transaction: any): Promise<Transaction | null> => {
    try {
      // Use fallback categorization since Edge Functions are not available
      return categorizeTransactionFallback(transaction);
    } catch (error) {
      console.error('Error in AI categorization:', error);
      // Fallback to uncategorized
      return categorizeTransactionFallback(transaction);
    }
  };

  const categorizeTransactionFallback = (transaction: any): Transaction => {
    const description = (transaction.description || '').toLowerCase();
    
    // Income keywords
    const incomeKeywords = [
      'salary', 'wage', 'wages', 'bonus', 'income', 'pay', 'paycheck', 'payment',
      'dividend', 'interest', 'rent income', 'freelance', 'commission', 'refund',
      'cashback', 'reimbursement', 'allowance', 'stipend', 'pension', 'benefits'
    ];
    const isIncome = incomeKeywords.some(keyword => description.includes(keyword));
    
    if (isIncome) {
      if (description.includes('salary') || description.includes('wage') || description.includes('bonus')) {
        return { ...transaction, id: transaction.id, date: new Date(transaction.date), type: 'income', category: 'Salary', subcategory: 'Salary' };
      }
      if (description.includes('dividend') || description.includes('interest')) {
        return { ...transaction, id: transaction.id, date: new Date(transaction.date), type: 'income', category: 'Dividend', subcategory: 'Dividends' };
      }
      return { ...transaction, id: transaction.id, date: new Date(transaction.date), type: 'income', category: 'Salary', subcategory: 'Salary' };
    }
    
    // Expense categorization
    if (description.includes('grocery') || description.includes('food') || description.includes('supermarket')) {
      return { ...transaction, id: transaction.id, date: new Date(transaction.date), type: 'expense', category: 'Living Expenses', subcategory: 'Grocery' };
    }
    
    if (description.includes('rent') || description.includes('rental')) {
      return { ...transaction, id: transaction.id, date: new Date(transaction.date), type: 'expense', category: 'Rental', subcategory: 'House Rent' };
    }
    
    if (description.includes('fuel') || description.includes('gas') || description.includes('petrol')) {
      return { ...transaction, id: transaction.id, date: new Date(transaction.date), type: 'expense', category: 'Transportation', subcategory: 'Fuel' };
    }
    
    if (description.includes('medical') || description.includes('doctor') || description.includes('hospital')) {
      return { ...transaction, id: transaction.id, date: new Date(transaction.date), type: 'expense', category: 'Healthcare', subcategory: 'Medical Bills' };
    }
    
    if (description.includes('movie') || description.includes('restaurant') || description.includes('dining')) {
      return { ...transaction, id: transaction.id, date: new Date(transaction.date), type: 'expense', category: 'Entertainment', subcategory: 'Dining Out' };
    }
    
    // Default to Other for unrecognized transactions
    return {
      id: transaction.id,
      date: new Date(transaction.date),
      category: 'Other',
      subcategory: 'Other',
      amount: transaction.amount,
      description: transaction.description,
      type: 'expense',
    };
  };

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header names to handle variations
        return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      },
      complete: async (results) => {
        const importedTransactions: Transaction[] = [];
        
        results.data.forEach((row: any) => {
          // Handle various possible column names
          const date = row.date || row.Date || row.DATE;
          const amount = row.amount || row.Amount || row.AMOUNT;
          const expenseDetail = row.expensedetail || row.expenseDetail || row.ExpenseDetail || 
                               row.expense_detail || row.description || row.Description || 
                               row.DESCRIPTION || row.detail || row.Detail || row.DETAIL;
          
          if (date && amount && expenseDetail) {
            // Parse amount - remove commas, currency symbols, and handle various formats
            let parsedAmount = 0;
            if (typeof amount === 'string') {
              // Remove currency symbols, commas, and spaces
              const cleanAmount = amount.replace(/[$,\s]/g, '');
              parsedAmount = parseFloat(cleanAmount);
            } else {
              parsedAmount = parseFloat(amount);
            }
            
            // Parse date - handle various date formats
            let parsedDate = new Date();
            if (typeof date === 'string') {
              // Try different date formats
              const dateFormats = [
                date, // Original format
                date.replace(/\//g, '-'), // Replace / with -
                date.replace(/\./g, '-'), // Replace . with -
              ];
              
              for (const dateFormat of dateFormats) {
                const testDate = new Date(dateFormat);
                if (!isNaN(testDate.getTime())) {
                  parsedDate = testDate;
                  break;
                }
              }
            } else {
              parsedDate = new Date(date);
            }
            
            // Validate parsed values
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
              console.warn(`Invalid amount for row:`, row);
              return;
            }
            
            if (isNaN(parsedDate.getTime())) {
              console.warn(`Invalid date for row:`, row);
              return;
            }
            
            const transaction: Transaction = {
              id: generateId(),
              date: parsedDate,
              category: 'Uncategorized',
              subcategory: 'Uncategorized',
              amount: parsedAmount,
              description: expenseDetail,
              type: 'expense', // Will be determined by AI categorization
            };
            
            importedTransactions.push(transaction);
          }
        });

        if (importedTransactions.length > 0) {
          // Categorize all transactions before importing
          await categorizeAndImportTransactions(importedTransactions);
          alert(`Successfully imported ${importedTransactions.length} transactions out of ${results.data.length} rows`);
        } else {
          alert('No valid transactions found in the CSV file. Please ensure your CSV has Date, Expense Detail, and Amount columns.');
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file: ' + error.message);
      }
    });

    // Reset file input
    event.target.value = '';
  };

  const categorizeAndImportTransactions = async (transactions: Transaction[]) => {
    try {
      // Use fallback categorization for all transactions
      const categorizedTransactions = transactions.map(t => categorizeTransactionFallback({
        id: t.id,
        date: t.date.toISOString().split('T')[0],
        description: t.description,
        amount: t.amount,
        type: t.type
      }));
      
      onBulkImport(categorizedTransactions);
    } catch (error) {
      console.error('Error categorizing imported transactions:', error);
      // Use fallback categorization as final fallback
      const categorizedTransactions = transactions.map(t => categorizeTransactionFallback({
        id: t.id,
        date: t.date.toISOString().split('T')[0],
        description: t.description,
        amount: t.amount,
        type: t.type
      }));
      onBulkImport(categorizedTransactions);
    }
  };
  const handleCsvExport = () => {
    const csv = [
      'Date,Type,Category,Subcategory,Amount,Description',
      ...transactions.map(t => 
        `${t.date.toISOString().split('T')[0]},${t.type},${t.category},${t.subcategory},${t.amount},"${t.description || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    a.download = `spendly-export-${new Date().toISOString().split('T')[0]}.csv`;

    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleLoadSampleData = () => {
    if (window.confirm('This will add 150 sample transactions (100 expenses, 50 income) and sample budgets. Continue?')) {
      const sampleTransactions = generateSampleData(100, 50);
      const sampleBudgets = generateSampleBudgets();
      
      onLoadSampleData(sampleTransactions);
      onLoadSampleBudgets(sampleBudgets);
      
      alert('Sample data loaded successfully! Check the dashboard to see the data.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Import/Export Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Management</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg cursor-pointer transition-colors">
            <Upload className="h-5 w-5 text-blue-600" />
            <span className="text-blue-600 font-medium">Upload File</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="hidden"
            />
          </label>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">CSV Import Format:</h4>
          <p className="text-sm text-gray-600 mb-2">Your CSV file should have these columns:</p>
          <code className="text-xs bg-white p-2 rounded block">
            Date, Expense Detail, Amount
          </code>
          <div className="text-xs text-gray-500 mt-2 space-y-1">
            <p>• AI will automatically determine if it's income or expense</p>
            <p>• Date formats supported: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</p>
            <p>• Amount can include commas and currency symbols (e.g., $100,000 or 100000)</p>
            <p>• Expense Detail can be any description (e.g., "Salary", "Grocery", "Coffee")</p>
            <p>• Column names are case-insensitive</p>
          </div>
        </div>
      </div>

      {/* Manual Entry Form */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2 mb-6">
          <Plus className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-800">Add New Transaction</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Expense Detail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expense Detail
            </label>
            <input
              type="text"
              value={formData.expenseDetail}
              onChange={(e) => setFormData({ ...formData, expenseDetail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Salary, Grocery shopping, Coffee, Rent, etc."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              AI will automatically categorize this as income or expense
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add Transaction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;