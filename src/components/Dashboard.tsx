import React, { useState } from 'react';
import { Transaction, Budget } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { 
  calculateMonthlyTotals, 
  calculateCategoryTotals, 
  getBudgetVariance, 
  formatCurrency 
} from '../utils/calculations';
import { getCategoryColor, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { TrendingUp, TrendingDown, AlertCircle, Download, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { exportMonthlyReportToExcel } from '../utils/excelExport';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, budgets }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Generate array of months for the slider (12 months back from current date)
  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const month = new Date();
      month.setMonth(currentDate.getMonth() - (11 - i));
      months.push(month);
    }
    return months;
  };

  const monthOptions = generateMonthOptions();
  const selectedMonthIndex = monthOptions.findIndex(month => 
    month.getMonth() === selectedMonth.getMonth() && 
    month.getFullYear() === selectedMonth.getFullYear()
  );

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value);
    setSelectedMonth(monthOptions[index]);
  };

  const currentMonth = selectedMonth;
  const monthlyData = calculateMonthlyTotals(transactions, budgets, currentMonth);
  const categoryTotals = calculateCategoryTotals(transactions, currentMonth);

  const handleExportExcel = () => {
    exportMonthlyReportToExcel(transactions, budgets, selectedMonth);
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  // Calculate net worth (total savings accumulated over time)
  const calculateNetWorth = () => {
    const allSavingsTransactions = transactions.filter(t => 
      t.type === 'expense' && 
      t.category === 'Savings' &&
      t.date <= endOfMonth(selectedMonth)
    );
    return allSavingsTransactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const netWorth = calculateNetWorth();

  // Summary cards calculations
  const incomeSurplus = monthlyData.income - monthlyData.expenses;
  const budgetVariance = monthlyData.budgetedExpenses - monthlyData.expenses;

  // Chart data preparations
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date;
  }).reverse();

  const monthlyChartData = last6Months.map(month => 
    calculateMonthlyTotals(transactions, budgets, month)
  );

  const incomeBarData = {
    labels: monthlyChartData.map(data => format(new Date(data.month + '-01'), 'MMM')),
    datasets: [
      {
        label: 'Actual Income',
        data: monthlyChartData.map(data => data.income),
        backgroundColor: '#22C55E',
        borderRadius: 4,
      },
      {
        label: 'Budgeted Income',
        data: monthlyChartData.map(data => data.budgetedIncome),
        backgroundColor: '#86EFAC',
        borderRadius: 4,
      }
    ]
  };

  const expenseBarData = {
    labels: monthlyChartData.map(data => format(new Date(data.month + '-01'), 'MMM')),
    datasets: [
      {
        label: 'Actual Expenses',
        data: monthlyChartData.map(data => data.expenses),
        backgroundColor: '#A16207',
        borderRadius: 4,
      },
      {
        label: 'Budgeted Expenses',
        data: monthlyChartData.map(data => data.budgetedExpenses),
        backgroundColor: '#FDE68A',
        borderRadius: 4,
      }
    ]
  };

  // Current month transactions for pie charts
  const currentMonthTransactions = transactions.filter(t => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return t.date >= monthStart && t.date <= monthEnd;
  });

  const categoryBudgets = budgets.filter(b => {
    const budgetMonth = new Date(b.month);
    return budgetMonth.getMonth() === currentMonth.getMonth() && 
           budgetMonth.getFullYear() === currentMonth.getFullYear();
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Export Button */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Financial Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {format(selectedMonth, 'MMMM yyyy')} Overview
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="mt-4 sm:mt-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Monthly Report</span>
          </button>
        </div>

        <div className="mt-8 pb-12 flex justify-center">
          <div className="w-3/4 relative">
            <input
              type="range"
              min="0"
              max={monthOptions.length - 1}
              value={selectedMonthIndex}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="absolute top-6 w-full">
              {monthOptions.map((month, index) => (
                <span 
                  key={index} 
                  className={`text-xs whitespace-nowrap ${
                    index === selectedMonthIndex ? 'text-green-600 font-medium' : 'text-gray-400'
                  }`}
                  style={{ 
                    left: `${(index / (monthOptions.length - 1)) * 100}%`,
                    transform: 'translateX(-50%)',
                    position: 'absolute'
                  }}
                >
                  {format(month, 'MMM yyyy')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Worth</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(netWorth)}
              </p>
              <p className="text-xs text-gray-500">Total Savings</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Income Surplus</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(incomeSurplus)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${
          budgetVariance >= 0 ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Variance</p>
              <p className={`text-2xl font-bold ${
                budgetVariance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(budgetVariance)}
              </p>
            </div>
            {budgetVariance >= 0 ? 
              <TrendingUp className="h-8 w-8 text-green-500" /> :
              <TrendingDown className="h-8 w-8 text-red-500" />
            }
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(monthlyData.expenses)}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(monthlyData.income)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* P&L Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Budget Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Income Trend (6 Months)</h3>
          <div className="h-64">
            <Bar 
              data={incomeBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value as number);
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Expense vs Budget Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Expense Trend (6 Months)</h3>
          <div className="h-64">
            <Bar 
              data={expenseBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value as number);
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Categories Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Income Categories</h3>
          <div className="h-64">
            {currentMonthTransactions.filter(t => t.type === 'income').length > 0 ? (
              <Pie 
                data={{
                  labels: Object.keys(INCOME_CATEGORIES).filter(cat => categoryTotals[cat] > 0),
                  datasets: [{
                    data: Object.keys(INCOME_CATEGORIES)
                      .filter(cat => categoryTotals[cat] > 0)
                      .map(cat => categoryTotals[cat]),
                    backgroundColor: Object.keys(INCOME_CATEGORIES)
                      .filter(cat => categoryTotals[cat] > 0)
                      .map(cat => getCategoryColor(cat)),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${formatCurrency(context.parsed)}`;
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No income data for this month
              </div>
            )}
          </div>
        </div>

        {/* Expense Categories Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Expense Categories</h3>
          <div className="h-64">
            {currentMonthTransactions.filter(t => t.type === 'expense').length > 0 ? (
              <Pie 
                data={{
                  labels: Object.keys(EXPENSE_CATEGORIES).filter(cat => categoryTotals[cat] > 0),
                  datasets: [{
                    data: Object.keys(EXPENSE_CATEGORIES)
                      .filter(cat => categoryTotals[cat] > 0)
                      .map(cat => categoryTotals[cat]),
                    backgroundColor: Object.keys(EXPENSE_CATEGORIES)
                      .filter(cat => categoryTotals[cat] > 0)
                      .map(cat => getCategoryColor(cat)),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${formatCurrency(context.parsed)}`;
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No expense data for this month
              </div>
            )}
          </div>
        </div>
      </div>

      {/* P&L Summary Section */}
      <div className="grid grid-cols-1 gap-6">
        {/* P&L Summary */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly P&L Summary</h3>
          <div className="space-y-4">
            {/* Income Section */}
            <div>
              <h4 className="font-medium text-green-700 mb-2">Income</h4>
              {Object.keys(INCOME_CATEGORIES).map(category => {
                const actual = categoryTotals[category] || 0;
                const budget = categoryBudgets.find(b => b.category === category)?.amount || 0;
                const variance = getBudgetVariance(actual, budget);

                return (
                  <div key={category} className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">{category}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">{formatCurrency(actual)}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        variance.isOver ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {variance.amount >= 0 ? '+' : ''}{formatCurrency(variance.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expense Section */}
            <div>
              <h4 className="font-medium text-amber-700 mb-2">Expenses</h4>
              {Object.keys(EXPENSE_CATEGORIES).slice(0, 5).map(category => {
                const actual = categoryTotals[category] || 0;
                const budget = categoryBudgets.find(b => b.category === category)?.amount || 0;
                const variance = getBudgetVariance(actual, budget);

                return (
                  <div key={category} className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">{category}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">{formatCurrency(actual)}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        !variance.isOver ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {variance.amount >= 0 ? '+' : ''}{formatCurrency(variance.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Net Result */}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">Net Result</span>
                <span className={`font-bold ${
                  incomeSurplus >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(incomeSurplus)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;