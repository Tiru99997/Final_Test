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
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    subcategory: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  
  const [customCategory, setCustomCategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);

  // Get dynamic categories from existing transactions using useMemo for performance
  const availableCategories = useMemo(() => {
    const transactionsByType = transactions.filter(t => t.type === formData.type);
    const dynamicCategories: { [key: string]: string[] } = {};
    
    // Start with predefined categories
    const baseCategories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    Object.keys(baseCategories).forEach(category => {
      dynamicCategories[category] = [...baseCategories[category]];
    });
    
    // Add categories and subcategories from existing transactions
    transactionsByType.forEach(transaction => {
      if (!dynamicCategories[transaction.category]) {
        dynamicCategories[transaction.category] = [];
      }
      if (!dynamicCategories[transaction.category].includes(transaction.subcategory)) {
        dynamicCategories[transaction.category].push(transaction.subcategory);
      }
    });
    
    // Sort subcategories for each category
    Object.keys(dynamicCategories).forEach(category => {
      dynamicCategories[category].sort();
    });
    
    return dynamicCategories;
  }, [transactions, formData.type]);
  
  const availableCategoryNames = useMemo(() => {
    return Object.keys(availableCategories).sort();
  }, [availableCategories]);
  
  // Reset category and subcategory when type changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, category: '', subcategory: '' }));
  }, [formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCategory = showCustomCategory ? customCategory : formData.category;
    const finalSubcategory = showCustomSubcategory ? customSubcategory : formData.subcategory;
    
    if (!finalCategory || !finalSubcategory || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    const transaction: Transaction = {
      id: generateId(),
      date: new Date(formData.date),
      category: finalCategory,
      subcategory: finalSubcategory,
      amount: parseFloat(formData.amount),
      description: formData.description,
      type: formData.type,
    };

    onAddTransaction(transaction);
    
    // Reset form
    setFormData({
      type: 'expense',
      category: '',
      subcategory: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setCustomCategory('');
    setCustomSubcategory('');
    setShowCustomCategory(false);
    setShowCustomSubcategory(false);
  };

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const importedTransactions: Transaction[] = [];
        
        results.data.forEach((row: any) => {
          if (row.Date && row.Amount && row.Category) {
            const transaction: Transaction = {
              id: generateId(),
              date: new Date(row.Date),
              category: row.Category,
              subcategory: row.Subcategory || row.Category,
              amount: parseFloat(row.Amount),
              description: row.Description || '',
              type: row.Type?.toLowerCase() === 'income' ? 'income' : 'expense',
            };
            
            if (!isNaN(transaction.amount)) {
              importedTransactions.push(transaction);
            }
          }
        });

        if (importedTransactions.length > 0) {
          onBulkImport(importedTransactions);
          alert(`Successfully imported ${importedTransactions.length} transactions`);
        } else {
          alert('No valid transactions found in the CSV file');
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        alert('Error parsing CSV file');
      }
    });

    // Reset file input
    event.target.value = '';
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
    a.download = `budget-tracker-${new Date().toISOString().split('T')[0]}.csv`;
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
            <span className="text-blue-600 font-medium">Import CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="hidden"
            />
          </label>
          
          <button
            onClick={handleCsvExport}
            className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="h-5 w-5 text-green-600" />
            <span className="text-green-600 font-medium">Export CSV</span>
          </button>
          
          <button
            onClick={handleLoadSampleData}
            className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 text-purple-600" />
            <span className="text-purple-600 font-medium">Load Sample Data</span>
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">CSV Import Format:</h4>
          <p className="text-sm text-gray-600 mb-2">Your CSV file should have these columns:</p>
          <code className="text-xs bg-white p-2 rounded block">
            Date, Type, Category, Subcategory, Amount, Description
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Type should be either "income" or "expense". Date format: YYYY-MM-DD
          </p>
        </div>
      </div>

      {/* Manual Entry Form */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2 mb-6">
          <Plus className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-800">Add New Transaction</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="expense"
                    checked={formData.type === 'expense'}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      type: e.target.value as 'expense',
                    })}
                    className="mr-2"
                  />
                  <span className="text-red-600 font-medium">Expense</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="income"
                    checked={formData.type === 'income'}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      type: e.target.value as 'income',
                    })}
                    className="mr-2"
                  />
                  <span className="text-green-600 font-medium">Income</span>
                </label>
              </div>
            </div>

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
          </div>

          {/* Category Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              {!showCustomCategory ? (
                <div className="space-y-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      category: e.target.value,
                      subcategory: ''
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select category...</option>
                    {availableCategoryNames.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomCategory(true)}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    + Add new category
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter new category name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomCategory(false)}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              {!showCustomSubcategory ? (
                <div className="space-y-2">
                  <select
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                    disabled={!formData.category && !customCategory}
                  >
                    <option value="">Select subcategory...</option>
                    {(formData.category ? availableCategories[formData.category] || [] : []).map(subcategory => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomSubcategory(true)}
                    className="text-sm text-green-600 hover:text-green-700"
                    disabled={!formData.category && !customCategory}
                  >
                    + Add new subcategory
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    placeholder="Enter new subcategory name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustomSubcategory(false)}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Amount and Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Add a note about this transaction"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;