import React from 'react';
import { Transaction } from '../types';
import { format, subMonths, startOfMonth } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { calculateSavingsProgress, calculateSavingsRate, formatCurrency } from '../utils/calculations';
import { TrendingUp, Target, PiggyBank, Percent } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SavingsDashboardProps {
  transactions: Transaction[];
}

const SavingsDashboard: React.FC<SavingsDashboardProps> = ({ transactions }) => {
  const currentDate = new Date();
  
  // Calculate savings from transactions categorized as 'Savings'
  const savingsTransactions = transactions.filter(t => 
    t.type === 'expense' && t.category === 'Savings'
  );
  
  // Calculate total income for savings rate calculation
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Monthly savings data for last 12 months
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date;
  }).reverse();

  const monthlySavingsData = last12Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const monthlyTransactions = transactions.filter(t => 
      t.date >= monthStart && t.date < monthEnd
    );

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlySavings = monthlyTransactions
      .filter(t => t.type === 'expense' && t.category === 'Savings')
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    return {
      month: format(month, 'MMM yyyy'),
      shortMonth: format(month, 'MMM'),
      income: monthlyIncome,
      savings: monthlySavings,
      savingsRate
    };
  });

  // Calculate cumulative savings (YTD)
  const totalSavings = savingsTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate average monthly savings
  const monthsWithSavings = monthlySavingsData.filter(data => data.savings > 0);
  const averageMonthlySavings = monthsWithSavings.length > 0 
    ? monthsWithSavings.reduce((sum, data) => sum + data.savings, 0) / monthsWithSavings.length
    : 0;
  
  // Calculate overall savings rate
  const overallSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  
  // Calculate shortfall in savings (15% target)
  const savingsTarget = 0.15; // 15%
  const targetSavings = totalIncome * savingsTarget;
  const savingsShortfall = Math.max(0, targetSavings - totalSavings);

  // Cumulative savings line chart
  let cumulativeSavings = 0;
  const cumulativeSavingsData = {
    labels: monthlySavingsData.map(data => data.shortMonth),
    datasets: [{
      label: 'Cumulative Savings',
      data: monthlySavingsData.map(data => {
        cumulativeSavings += data.savings;
        return cumulativeSavings;
      }),
      borderColor: '#059669',
      backgroundColor: 'rgba(5, 150, 105, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  };

  // Savings by subcategory (pie chart)
  const savingsByCategory = savingsTransactions.reduce((acc, t) => {
    acc[t.subcategory] = (acc[t.subcategory] || 0) + t.amount;
    return acc;
  }, {} as { [key: string]: number });

  const savingsPieData = {
    labels: Object.keys(savingsByCategory),
    datasets: [{
      data: Object.values(savingsByCategory),
      backgroundColor: [
        '#059669', // SIPs
        '#10B981', // Fixed Deposits  
        '#34D399', // Recurring Deposits
        '#6EE7B7', // Emergency Fund
        '#A7F3D0', // Investment Savings
        '#D1FAE5', // Retirement Savings
      ],
      borderWidth: 2,
      borderColor: '#ffffff',
    }]
  };

  // Monthly savings rate bar chart
  const savingsRateData = {
    labels: monthlySavingsData.map(data => data.shortMonth),
    datasets: [{
      label: 'Savings Rate (%)',
      data: monthlySavingsData.map(data => data.savingsRate),
      backgroundColor: 'rgba(5, 150, 105, 0.8)',
      borderColor: '#059669',
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  // Calculate current month metrics
  const currentMonthData = monthlySavingsData[monthlySavingsData.length - 1] || {
    income: 0,
    savings: 0,
    savingsRate: 0
  };

  // Calculate monthly savings target (15% of current month income)
  const monthlyTarget = currentMonthData.income * savingsTarget;
  const monthlyProgress = monthlyTarget > 0 ? (currentMonthData.savings / monthlyTarget) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Savings (YTD)</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalSavings)}
              </p>
            </div>
            <PiggyBank className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Monthly Savings</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(averageMonthlySavings)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {overallSavingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-purple-500">
                Target: 15%
              </p>
            </div>
            <Percent className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${
          savingsShortfall > 0 ? 'border-red-500' : 'border-green-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Savings Shortfall</p>
              <p className={`text-2xl font-bold ${
                savingsShortfall > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(savingsShortfall)}
              </p>
              <p className="text-xs text-gray-500">
                Target: {formatCurrency(targetSavings)}
              </p>
            </div>
            <Target className={`h-8 w-8 ${
              savingsShortfall > 0 ? 'text-red-500' : 'text-green-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Savings Targets Progress */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Monthly Savings Goal Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Current Month Goal (15% of Income)</span>
              <span className="text-sm text-gray-800">
                {formatCurrency(currentMonthData.savings)} / {formatCurrency(monthlyTarget)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(monthlyProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{monthlyProgress.toFixed(1)}% complete</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Overall Savings Rate Goal</span>
              <span className="text-sm text-gray-800">
                {overallSavingsRate.toFixed(1)}% / 15%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  overallSavingsRate >= 15 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((overallSavingsRate / 15) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((overallSavingsRate / 15) * 100).toFixed(1)}% of target achieved
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Savings Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cumulative Savings Trend</h3>
          <div className="h-64">
            <Line 
              data={cumulativeSavingsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
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

        {/* Savings by Type Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Savings by Type</h3>
          <div className="h-64">
            {Object.keys(savingsByCategory).length > 0 ? (
              <Pie 
                data={savingsPieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right' },
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No savings data available
              </div>
            )}
          </div>
        </div>

        {/* Monthly Savings Rate */}
        <div className="bg-white p-6 rounded-xl shadow-lg lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Savings Rate</h3>
          <div className="h-64">
            <Bar 
              data={savingsRateData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    max: 50,
                    ticks: {
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Savings Breakdown Table */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Savings Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Savings Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(savingsByCategory).map(([type, amount]) => (
                <tr key={type} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800">{type}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-800">
                    {formatCurrency(amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {totalSavings > 0 ? ((amount / totalSavings) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              {Object.keys(savingsByCategory).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    No savings data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SavingsDashboard;