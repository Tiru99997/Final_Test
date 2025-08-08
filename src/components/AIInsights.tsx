import React, { useState } from 'react';
import { Transaction } from '../types';
import { Brain, TrendingUp, AlertCircle, Loader, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface AIInsightsProps {
  transactions: Transaction[];
}

interface FinancialMetrics {
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  incomeSurplus: number;
  savingsRate: number;
  topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  monthlyTrends: Array<{ month: string; income: number; expenses: number; surplus: number }>;
  insights: string[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ transactions }) => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFinances = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-analysis`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: transactions.map(t => ({
            id: t.id,
            date: t.date.toISOString().split('T')[0],
            description: t.description || `${t.category} - ${t.subcategory}`,
            amount: t.amount,
            category: t.category,
            subcategory: t.subcategory,
            type: t.type
          })),
          action: 'analyze'
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Error analyzing finances:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze finances');
    } finally {
      setLoading(false);
    }
  };

  const categorizeTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-analysis`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: transactions.map(t => ({
            id: t.id,
            date: t.date.toISOString().split('T')[0],
            description: t.description || `${t.category} - ${t.subcategory}`,
            amount: t.amount,
            category: t.category,
            subcategory: t.subcategory,
            type: t.type
          })),
          action: 'categorize'
        })
      });

      if (!response.ok) {
        throw new Error(`Categorization failed: ${response.status}`);
      }

      const data = await response.json();
      alert(`Successfully categorized ${data.categorizedTransactions.length} transactions!`);
    } catch (err) {
      console.error('Error categorizing transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to categorize transactions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-semibold text-gray-800">AI Financial Insights</h2>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={analyzeFinances}
            disabled={loading || transactions.length === 0}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            <span>Analyze Finances</span>
          </button>
          
          <button
            onClick={categorizeTransactions}
            disabled={loading || transactions.length === 0}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>Auto-Categorize</span>
          </button>
        </div>

        {transactions.length === 0 && (
          <p className="text-gray-500 mt-4">Add some transactions to get AI-powered insights!</p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Metrics Display */}
      {metrics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
              <h3 className="text-sm font-medium text-gray-600">Net Worth</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.netWorth)}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
              <h3 className="text-sm font-medium text-gray-600">Income Surplus</h3>
              <p className={`text-2xl font-bold ${
                metrics.incomeSurplus >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                {formatCurrency(metrics.incomeSurplus)}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
              <h3 className="text-sm font-medium text-gray-600">Savings Rate</h3>
              <p className="text-2xl font-bold text-purple-600">
                {metrics.savingsRate.toFixed(1)}%
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500">
              <h3 className="text-sm font-medium text-gray-600">Total Expenses</h3>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(metrics.totalExpenses)}
              </p>
            </div>
          </div>

          {/* Top Expense Categories */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Expense Categories</h3>
            <div className="space-y-3">
              {metrics.topExpenseCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{category.category}</span>
                      <span className="text-sm text-gray-600">{formatCurrency(category.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{category.percentage.toFixed(1)}% of expenses</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">AI-Generated Insights</h3>
            <div className="space-y-3">
              {metrics.insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                  <Brain className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trends</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-600">Income</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-600">Expenses</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-600">Surplus</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.monthlyTrends.map((trend, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-800">{trend.month}</td>
                      <td className="py-2 px-4 text-right text-green-600 font-medium">
                        {formatCurrency(trend.income)}
                      </td>
                      <td className="py-2 px-4 text-right text-red-600 font-medium">
                        {formatCurrency(trend.expenses)}
                      </td>
                      <td className={`py-2 px-4 text-right font-medium ${
                        trend.surplus >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(trend.surplus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIInsights;