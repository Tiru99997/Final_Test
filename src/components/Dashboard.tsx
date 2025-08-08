import React, { useState } from 'react';
import { Transaction, Budget } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  calculateMonthlyTotals, 
  calculateCategoryTotals, 
  getBudgetVariance, 
  formatCurrency 
} from '../utils/calculations';
import { getCategoryColor, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { TrendingUp, TrendingDown, AlertCircle, Download, ChevronLeft, ChevronRight, Wallet, Brain, Loader } from 'lucide-react';
import { exportMonthlyReportToExcel } from '../utils/excelExport';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
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
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  
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

  // Calculate KPIs
  const calculateKPIs = () => {
    // Net worth (total savings accumulated over time)
    const allSavingsTransactions = transactions.filter(t => {
      if (t.type !== 'expense' || t.date > endOfMonth(selectedMonth)) return false;
      
      // Check if it's in the Savings category
      if (t.category === 'Savings') return true;
      
      // Check if it's an investment-related transaction
      const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
      const description = (t.description || '').toLowerCase();
      const subcategory = (t.subcategory || '').toLowerCase();
      
      return investmentKeywords.some(keyword => 
        description.includes(keyword) || subcategory.includes(keyword)
      );
    });
    const netWorth = allSavingsTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate monthly averages
    const monthsWithData = new Set(transactions.map(t => format(t.date, 'yyyy-MM')));
    const monthCount = monthsWithData.size || 1;

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalSavings = allSavingsTransactions.reduce((sum, t) => sum + t.amount, 0);

    const avgMonthlyIncome = totalIncome / monthCount;
    const avgMonthlyExpense = totalExpenses / monthCount;
    const savingsRatio = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    // Calculate debt to income ratio
    const debtTransactions = transactions.filter(t => t.type === 'expense' && t.category === 'Debt');
    const totalDebt = debtTransactions.reduce((sum, t) => sum + t.amount, 0);
    const debtToIncomeRatio = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;

    return {
      netWorth,
      avgMonthlyIncome,
      avgMonthlyExpense,
      savingsRatio,
      debtToIncomeRatio
    };
  };

  const kpis = calculateKPIs();

  // Auto-generate insights when transactions change
  useEffect(() => {
    if (transactions.length > 0 && !loadingInsights && insights.length === 0) {
      generateInsights();
    }
  }, [transactions]);

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

  // Combined income and expense line chart
  const incomeExpenseLineData = {
    labels: monthlyChartData
      .filter(data => data.income > 0 || data.expenses > 0)
      .map(data => format(new Date(data.month + '-01'), 'MMM')),
    datasets: [
      {
        label: 'Income',
        data: monthlyChartData
          .filter(data => data.income > 0 || data.expenses > 0)
          .map(data => data.income),
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Expenses',
        data: monthlyChartData
          .filter(data => data.income > 0 || data.expenses > 0)
          .map(data => data.expenses),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.4,
      }
    ]
  };

  // Generate AI insights
  const generateInsights = async () => {
    setLoadingInsights(true);
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

      if (response.ok) {
        const data = await response.json();
        setInsights(data.metrics?.insights || []);
      } else {
        // Fallback insights based on calculations
        const fallbackInsights = [];
        
        if (kpis.debtToIncomeRatio > 36) {
          fallbackInsights.push(`Your debt-to-income ratio is ${kpis.debtToIncomeRatio.toFixed(1)}%, which is above the recommended 36%. Consider paying down high-interest debt first.`);
        } else {
          fallbackInsights.push(`Your debt-to-income ratio of ${kpis.debtToIncomeRatio.toFixed(1)}% is healthy and within recommended limits.`);
        }
        
        if (kpis.savingsRatio < 15) {
          fallbackInsights.push(`Your savings rate of ${kpis.savingsRatio.toFixed(1)}% is below the recommended 15%. Try to increase your savings by reducing discretionary spending.`);
        } else {
          fallbackInsights.push(`Excellent! Your savings rate of ${kpis.savingsRatio.toFixed(1)}% exceeds the recommended 15%.`);
        }
        
        fallbackInsights.push("Consider diversifying your investment portfolio with a mix of equity and fixed-income investments based on your risk tolerance.");
        
        setInsights(fallbackInsights);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      setInsights(['Unable to generate insights at this time. Please try again later.']);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Get last 6 months with data for P&L summary
  const getMonthsWithData = () => {
    const monthsWithData = Array.from(new Set(
      transactions.map(t => format(t.date, 'yyyy-MM'))
    )).sort().reverse().slice(0, 6);
    
    return monthsWithData.map(month => {
      const monthDate = new Date(month + '-01');
      const monthlyData = calculateMonthlyTotals(transactions, budgets, monthDate);
      return {
        month: format(monthDate, 'MMM yyyy'),
        ...monthlyData
      };
    });
  };

  const monthsWithData = getMonthsWithData();

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Worth</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(kpis.netWorth)}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Monthly Income</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(kpis.avgMonthlyIncome)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Monthly Expense</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(kpis.avgMonthlyExpense)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Savings Ratio</p>
              <p className="text-2xl font-bold text-purple-600">
                {kpis.savingsRatio.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${
          kpis.debtToIncomeRatio > 36 ? 'border-red-500' : 'border-green-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Debt to Income Ratio</p>
              <p className={`text-2xl font-bold ${
                kpis.debtToIncomeRatio > 36 ? 'text-red-600' : 'text-green-600'
              }`}>
                {kpis.debtToIncomeRatio.toFixed(1)}%
              </p>
            </div>
            <AlertCircle className={`h-8 w-8 ${
              kpis.debtToIncomeRatio > 36 ? 'text-red-500' : 'text-green-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Income vs Expense Trend and Personal Finance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Combined Income and Expense Trend */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Income vs Expense Trend</h3>
          <div className="h-64">
            <Line 
              data={incomeExpenseLineData}
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

        {/* Personal Finance Insights */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Personal Finance Insights</h3>
            <button
              onClick={generateInsights}
              disabled={loadingInsights}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-2"
            >
              {loadingInsights ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              <span>{loadingInsights ? 'Analyzing...' : 'Generate'}</span>
            </button>
          </div>
          <div className="h-64">
            {loadingInsights ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : insights.length > 0 ? (
              <div className="space-y-3 overflow-y-auto h-full">
                {insights.map((insight, index) => (
                  <div key={index} className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-500">
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Click "Generate" to get AI-powered insights</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* P&L Summary Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly P&L Summary (Last 6 Months)</h3>
        {monthsWithData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Month</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Income</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Expenses</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Net Surplus</th>
                </tr>
              </thead>
              <tbody>
                {monthsWithData.map((monthData, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800 font-medium">{monthData.month}</td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">
                      {formatCurrency(monthData.income)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 font-medium">
                      {formatCurrency(monthData.expenses)}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      (monthData.income - monthData.expenses) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(monthData.income - monthData.expenses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No transaction data available
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;