import React, { useState, useEffect } from 'react';
import { Budget } from '../types';
import { getAllCategories, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { formatCurrency } from '../utils/calculations';
import { format } from 'date-fns';
import { Settings, Plus, Trash2, Save } from 'lucide-react';

interface BudgetSettingsProps {
  budgets: Budget[];
  onUpdateBudgets: (budgets: Budget[]) => void;
}

const BudgetSettings: React.FC<BudgetSettingsProps> = ({ budgets, onUpdateBudgets }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });
  
  const [monthlyBudgets, setMonthlyBudgets] = useState<{ [category: string]: number }>({});
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Load budgets for selected month
  useEffect(() => {
    const currentMonthBudgets = budgets.filter(b => b.month === selectedMonth);
    const budgetMap = currentMonthBudgets.reduce((acc, budget) => {
      acc[budget.category] = budget.amount;
      return acc;
    }, {} as { [category: string]: number });
    
    setMonthlyBudgets(budgetMap);
  }, [budgets, selectedMonth]);

  const allCategories = getAllCategories();
  const availableCategories = Object.keys(allCategories).filter(
    cat => !monthlyBudgets.hasOwnProperty(cat)
  );

  const handleBudgetChange = (category: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    setMonthlyBudgets(prev => ({
      ...prev,
      [category]: numAmount
    }));
  };

  const handleAddCategory = () => {
    if (newCategory && newAmount) {
      const amount = parseFloat(newAmount);
      if (amount > 0) {
        setMonthlyBudgets(prev => ({
          ...prev,
          [newCategory]: amount
        }));
        setNewCategory('');
        setNewAmount('');
      }
    }
  };

  const handleRemoveCategory = (category: string) => {
    setMonthlyBudgets(prev => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
  };

  const handleSave = () => {
    // Remove existing budgets for this month
    const otherMonthBudgets = budgets.filter(b => b.month !== selectedMonth);
    
    // Create new budget entries
    const newBudgets = Object.entries(monthlyBudgets)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({
        category,
        amount,
        month: selectedMonth
      }));

    const allBudgets = [...otherMonthBudgets, ...newBudgets];
    onUpdateBudgets(allBudgets);
    
    alert('Budget saved successfully!');
  };

  const totalBudget = Object.values(monthlyBudgets).reduce((sum, amount) => sum + amount, 0);
  const incomeBudget = Object.entries(monthlyBudgets)
    .filter(([category]) => Object.keys(INCOME_CATEGORIES).includes(category))
    .reduce((sum, [_, amount]) => sum + amount, 0);
  const expenseBudget = Object.entries(monthlyBudgets)
    .filter(([category]) => Object.keys(EXPENSE_CATEGORIES).includes(category))
    .reduce((sum, [_, amount]) => sum + amount, 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-semibold text-gray-800">Budget Settings</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Budget</div>
            <div className="text-2xl font-bold text-gray-800">
              {formatCurrency(totalBudget)}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <h3 className="text-lg font-medium text-gray-800">Income Budget</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(incomeBudget)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
          <h3 className="text-lg font-medium text-gray-800">Expense Budget</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(expenseBudget)}</p>
        </div>
        
        <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${
          incomeBudget - expenseBudget >= 0 ? 'border-green-500' : 'border-red-500'
        }`}>
          <h3 className="text-lg font-medium text-gray-800">Projected Surplus</h3>
          <p className={`text-2xl font-bold ${
            incomeBudget - expenseBudget >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(incomeBudget - expenseBudget)}
          </p>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Category Budgets</h3>
        
        {/* Income Categories */}
        <div className="mb-8">
          <h4 className="font-medium text-green-700 mb-4">Income Categories</h4>
          <div className="space-y-3">
            {Object.entries(monthlyBudgets)
              .filter(([category]) => Object.keys(INCOME_CATEGORIES).includes(category))
              .map(([category, amount]) => (
                <div key={category} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {category}
                    </label>
                    <div className="text-xs text-gray-500">
                      {INCOME_CATEGORIES[category]?.join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount || ''}
                      onChange={(e) => handleBudgetChange(category, e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="mb-8">
          <h4 className="font-medium text-red-700 mb-4">Expense Categories</h4>
          <div className="space-y-3">
            {Object.entries(monthlyBudgets)
              .filter(([category]) => Object.keys(EXPENSE_CATEGORIES).includes(category))
              .map(([category, amount]) => (
                <div key={category} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {category}
                    </label>
                    <div className="text-xs text-gray-500">
                      {EXPENSE_CATEGORIES[category]?.join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount || ''}
                      onChange={(e) => handleBudgetChange(category, e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Add New Category */}
        {availableCategories.length > 0 && (
          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-700 mb-4">Add Category</h4>
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select category...</option>
                  {availableCategories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={handleAddCategory}
                disabled={!newCategory || !newAmount}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Budget</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetSettings;