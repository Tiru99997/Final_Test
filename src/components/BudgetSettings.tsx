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
          <h2 className="text-2xl font-semibold text-gray-800">Credit Card Recommendations</h2>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            Based on your spending patterns, here are personalized credit card recommendations to maximize your rewards and benefits.
          </p>
        </div>
      </div>

      {/* Credit Card Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <h3 className="text-lg font-medium text-gray-800">Grocery & Dining</h3>
          <p className="text-sm text-gray-600 mb-3">Best for everyday spending</p>
          <div className="space-y-2">
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-medium text-blue-800">Chase Freedom Flex</h4>
              <p className="text-xs text-blue-600">5% on rotating categories, 3% on dining</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-medium text-blue-800">Citi Double Cash</h4>
              <p className="text-xs text-blue-600">2% on all purchases</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <h3 className="text-lg font-medium text-gray-800">Travel & Transportation</h3>
          <p className="text-sm text-gray-600 mb-3">Best for travel rewards</p>
          <div className="space-y-2">
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-medium text-green-800">Chase Sapphire Preferred</h4>
              <p className="text-xs text-green-600">2x on travel & dining, transferable points</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-medium text-green-800">Capital One Venture</h4>
              <p className="text-xs text-green-600">2x miles on all purchases</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <h3 className="text-lg font-medium text-gray-800">Cashback & General</h3>
          <p className="text-sm text-gray-600 mb-3">Best overall value</p>
          <div className="space-y-2">
            <div className="bg-purple-50 p-3 rounded">
              <h4 className="font-medium text-purple-800">Discover it Cash Back</h4>
              <p className="text-xs text-purple-600">5% rotating categories, 1% on all</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <h4 className="font-medium text-purple-800">Bank of America Cash Rewards</h4>
              <p className="text-xs text-purple-600">3% on category of choice</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Recommendations */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Personalized Recommendations</h3>
        
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3">Based on Your Spending Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-blue-700 mb-2">Top Spending Categories:</h5>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Living Expenses (Grocery, Utilities)</li>
                  <li>• Transportation (Fuel, Maintenance)</li>
                  <li>• Entertainment (Dining, Movies)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-700 mb-2">Recommended Strategy:</h5>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Use rotating category cards for groceries</li>
                  <li>• Travel card for gas and dining</li>
                  <li>• Flat-rate card for everything else</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-3">Optimization Tips</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <p className="text-sm text-green-700">
                  <strong>Maximize rotating categories:</strong> Use Chase Freedom Flex or Discover it for 5% back on quarterly categories
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <p className="text-sm text-green-700">
                  <strong>Stack with dining:</strong> Chase Sapphire Preferred gives 2x points on dining, which transfers to travel partners
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <p className="text-sm text-green-700">
                  <strong>Consider annual fees:</strong> Premium cards can be worth it if you spend enough in bonus categories
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-3">Important Considerations</h4>
            <div className="space-y-2">
              <p className="text-sm text-yellow-700">
                • Always pay your full balance on time to avoid interest charges
              </p>
              <p className="text-sm text-yellow-700">
                • Don't spend more just to earn rewards - the rewards should be a bonus
              </p>
              <p className="text-sm text-yellow-700">
                • Consider your credit score and approval odds before applying
              </p>
              <p className="text-sm text-yellow-700">
                • Space out applications to minimize impact on your credit score
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetSettings;