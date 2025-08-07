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
import { formatCurrency } from '../utils/calculations';
import { TrendingUp, Target, DollarSign, Percent } from 'lucide-react';

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

interface InvestmentsDashboardProps {
  transactions: Transaction[];
}

const InvestmentsDashboard: React.FC<InvestmentsDashboardProps> = ({ transactions }) => {
  const currentDate = new Date();
  
  // Calculate total investments
  const totalInvestments = transactions
    .filter(t => t.type === 'expense' && t.category === 'Investments')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Monthly investments data for last 12 months
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date;
  }).reverse();

  const monthlyInvestmentData = last12Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const monthlyTransactions = transactions.filter(t => 
      t.date >= monthStart && t.date < monthEnd
    );

    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const investments = monthlyTransactions
      .filter(t => t.type === 'expense' && t.category === 'Investments')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      month: format(month, 'MMM yyyy'),
      shortMonth: format(month, 'MMM'),
      income,
      expenses,
      investments,
      investmentRate: income > 0 ? (investments / income) * 100 : 0
    };
  });

  // Cumulative investments line chart
  let cumulativeInvestments = 0;
  const cumulativeInvestmentData = {
    labels: monthlyInvestmentData.map(data => data.shortMonth),
    datasets: [{
      label: 'Cumulative Investments',
      data: monthlyInvestmentData.map(data => {
        cumulativeInvestments += data.investments;
        return cumulativeInvestments;
      }),
      borderColor: '#7C3AED',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  };

  // Investments by subcategory (pie chart)
  const investmentTransactions = transactions.filter(t => 
    t.type === 'expense' && t.category === 'Investments'
  );
  
  const investmentsBySubcategory = investmentTransactions.reduce((acc, t) => {
    acc[t.subcategory] = (acc[t.subcategory] || 0) + t.amount;
    return acc;
  }, {} as { [key: string]: number });

  const investmentsPieData = {
    labels: Object.keys(investmentsBySubcategory),
    datasets: [{
      data: Object.values(investmentsBySubcategory),
      backgroundColor: [
        '#7C3AED', // Stocks
        '#A855F7', // Bonds  
        '#C084FC', // Commodity
        '#DDD6FE', // Crypto
      ],
      borderWidth: 2,
      borderColor: '#ffffff',
    }]
  };

  // Monthly investment rate bar chart
  const investmentRateData = {
    labels: monthlyInvestmentData.map(data => data.shortMonth),
    datasets: [{
      label: 'Investment Rate (%)',
      data: monthlyInvestmentData.map(data => data.investmentRate),
      backgroundColor: 'rgba(124, 58, 237, 0.8)',
      borderColor: '#7C3AED',
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  // Calculate current month metrics
  const currentMonthData = monthlyInvestmentData[monthlyInvestmentData.length - 1] || {
    income: 0,
    expenses: 0,
    investments: 0,
    investmentRate: 0
  };

  // Mock investment targets (in real app, these would be user-defined)
  const investmentTargets = {
    monthly: 1500,
    annual: 18000,
    portfolio: 250000,
  };

  const monthlyProgress = (currentMonthData.investments / investmentTargets.monthly) * 100;
  const annualProgress = (totalInvestments / investmentTargets.annual) * 100;

  // Calculate portfolio performance (mock data - in real app would come from API)
  const portfolioValue = totalInvestments * 1.12; // Assuming 12% growth
  const portfolioGain = portfolioValue - totalInvestments;
  const portfolioGainPercent = totalInvestments > 0 ? (portfolioGain / totalInvestments) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invested</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalInvestments)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(portfolioValue)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Gain</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(portfolioGain)}
              </p>
              <p className="text-xs text-green-500">
                +{portfolioGainPercent.toFixed(1)}%
              </p>
            </div>
            <Percent className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Invested</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(currentMonthData.investments)}
              </p>
            </div>
            <Target className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Investment Targets Progress */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Investment Goals Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Monthly Goal</span>
              <span className="text-sm text-gray-800">
                {formatCurrency(currentMonthData.investments)} / {formatCurrency(investmentTargets.monthly)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(monthlyProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{monthlyProgress.toFixed(1)}% complete</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Annual Goal</span>
              <span className="text-sm text-gray-800">
                {formatCurrency(totalInvestments)} / {formatCurrency(investmentTargets.annual)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(annualProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{annualProgress.toFixed(1)}% complete</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Investments Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cumulative Investments Trend</h3>
          <div className="h-64">
            <Line 
              data={cumulativeInvestmentData}
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

        {/* Investments by Type Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Investment Portfolio</h3>
          <div className="h-64">
            {Object.keys(investmentsBySubcategory).length > 0 ? (
              <Pie 
                data={investmentsPieData}
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
                No investment data available
              </div>
            )}
          </div>
        </div>

        {/* Monthly Investment Rate */}
        <div className="bg-white p-6 rounded-xl shadow-lg lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Investment Rate</h3>
          <div className="h-64">
            <Bar 
              data={investmentRateData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    max: 30,
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

      {/* Investment Breakdown Table */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Investment Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Investment Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Amount Invested</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Portfolio %</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Est. Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(investmentsBySubcategory).map(([type, amount]) => {
                const estimatedValue = amount * 1.12; // Mock 12% growth
                return (
                  <tr key={type} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800">{type}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800">
                      {formatCurrency(amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {((amount / totalInvestments) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-green-600">
                      {formatCurrency(estimatedValue)}
                    </td>
                  </tr>
                );
              })}
              {Object.keys(investmentsBySubcategory).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No investment data available
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

export default InvestmentsDashboard;