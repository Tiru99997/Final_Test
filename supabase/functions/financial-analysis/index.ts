import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category?: string
  subcategory?: string
  type: 'income' | 'expense'
}

interface CategorizationRequest {
  transactions: Transaction[]
  action: 'categorize' | 'analyze'
}

interface FinancialMetrics {
  netWorth: number
  totalIncome: number
  totalExpenses: number
  incomeSurplus: number
  savingsRate: number
  topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>
  monthlyTrends: Array<{ month: string; income: number; expenses: number; surplus: number }>
  insights: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactions, action }: CategorizationRequest = await req.json()

    if (!transactions || !Array.isArray(transactions)) {
      return new Response(
        JSON.stringify({ error: 'Invalid transactions data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured, using fallback categorization')
      // Use fallback categorization when API key is not available
      if (action === 'categorize') {
        const categorizedTransactions = categorizeTransactionsFallback(transactions)
        return new Response(
          JSON.stringify({ categorizedTransactions }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    if (action === 'categorize') {
      // Categorize transactions using OpenAI
      const categorizedTransactions = await categorizeTransactions(transactions, openaiApiKey)
      
      return new Response(
        JSON.stringify({ categorizedTransactions }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else if (action === 'analyze') {
      // Calculate metrics and generate insights
      const metrics = await analyzeFinancialData(transactions, openaiApiKey)
      
      return new Response(
        JSON.stringify({ metrics }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in financial-analysis function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function categorizeTransactions(transactions: Transaction[], apiKey: string): Promise<Transaction[]> {
  const uncategorizedTransactions = transactions.filter(t => !t.category || t.category === 'Uncategorized')
  
  if (uncategorizedTransactions.length === 0) {
    return transactions
  }

  // Process transactions in batches of 10 to avoid token limits
  const batchSize = 10
  const categorizedTransactions = [...transactions]
  
  for (let i = 0; i < uncategorizedTransactions.length; i += batchSize) {
    const batch = uncategorizedTransactions.slice(i, i + batchSize)
    
    const prompt = `
You are a financial categorization expert. Categorize the following transactions into appropriate categories and subcategories.

Available Categories:
EXPENSE CATEGORIES:
- Living Expenses (Grocery, Food, Restaurant, Coffee, Utilities, Electricity, Gas, Water, Internet, Phone, Household Items, Personal Care)
- Rental (Rent, Mortgage, Property Tax, Home Insurance, HOA Fees, Maintenance, Repairs)
- Travel (Flight, Hotel, Car Rental, Gas, Parking, Taxi, Uber, Train, Bus, Vacation)
- Entertainment (Movies, Concerts, Sports Events, Netflix, Spotify, Gaming, Books, Hobbies)
- Medical (Scans, Medical Insurance, Physiotherapy, Dental, Prescriptions, GP, Blood test, Hospital)
- Personal Development (Courses, Gym, Training, Books, Workshops)
- Shopping (Clothes, Electronics, Gifts, Personal Items, Home Decor, Furniture, Appliances)
- Charity (Donation)
- Savings (Long term saving, Short term saving)
- Investments (Stocks, Bonds, Commodity, Crypto)
- Other (Miscellaneous, Fees, Taxes, Insurance, Legal, Professional Services)

INCOME CATEGORIES:
- Income (Salary, Wages, Bonus, Overtime, Commission, Freelance, Business Income, Side Hustle)
- Rental Income (Property Rent, Room Rent, Airbnb, Parking Rent)
- Investment Income (Dividends, Interest, Capital Gains, Crypto Gains)
- Other Income (Gifts, Refunds, Cashback, Lottery, Insurance Claims)

Transactions to categorize:
${batch.map(t => `- ${t.description} ($${t.amount}) [${t.type}]`).join('\n')}

Rules:
1. Determine if each transaction is "income" or "expense" based on the description
2. Choose the most appropriate category and subcategory
3. Group food-related expenses under "Living Expenses"
4. Group housing costs under "Rental"
5. Group transportation under "Travel"

Return a JSON array with the same order, each containing:
{
  "category": "category_name",
  "subcategory": "subcategory_name",
  "type": "income" or "expense",
  "confidence": 0.95
}

Only return the JSON array, no other text.`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a financial categorization expert. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        console.error('OpenAI API error:', response.status, await response.text())
        continue
      }

      const data = await response.json()
      const categorizations = JSON.parse(data.choices[0].message.content)

      // Apply categorizations to transactions
      batch.forEach((transaction, index) => {
        if (categorizations[index]) {
          const transactionIndex = categorizedTransactions.findIndex(t => t.id === transaction.id)
          if (transactionIndex !== -1) {
            categorizedTransactions[transactionIndex] = {
              ...categorizedTransactions[transactionIndex],
              category: categorizations[index].category,
              subcategory: categorizations[index].subcategory,
              type: categorizations[index].type || categorizedTransactions[transactionIndex].type
            }
          }
        }
      })

    } catch (error) {
      console.error('Error categorizing batch:', error)
    }
  }

  return categorizedTransactions
}

function categorizeTransactionsFallback(transactions: Transaction[]): Transaction[] {
  return transactions.map(transaction => {
    const description = transaction.description.toLowerCase()
    
    // Income keywords
    const incomeKeywords = [
      'salary', 'wage', 'wages', 'bonus', 'income', 'pay', 'paycheck', 'payment',
      'dividend', 'interest', 'rent income', 'freelance', 'commission', 'refund',
      'cashback', 'reimbursement', 'allowance', 'stipend', 'pension', 'benefits'
    ]
    const isIncome = incomeKeywords.some(keyword => description.includes(keyword))
    
    if (isIncome) {
      return {
        ...transaction,
        type: 'income',
        category: 'Fixed Income',
        subcategory: 'Salary'
      }
    }
    
    // Expense categorization
    if (description.includes('grocery') || description.includes('food') || description.includes('restaurant') || description.includes('coffee') || description.includes('lunch') || description.includes('dinner')) {
      return { ...transaction, type: 'expense', category: 'Living Expenses', subcategory: 'Grocery' }
    }
    
    if (description.includes('rent') || description.includes('mortgage') || description.includes('utilities')) {
      return { ...transaction, type: 'expense', category: 'Bills', subcategory: 'Rent' }
    }
    
    if (description.includes('gas') || description.includes('uber') || description.includes('taxi') || description.includes('bus')) {
      return { ...transaction, type: 'expense', category: 'Transport', subcategory: 'Taxi' }
    }
    
    if (description.includes('movie') || description.includes('netflix') || description.includes('spotify') || description.includes('entertainment') || description.includes('vacation') || description.includes('holiday')) {
      return { ...transaction, type: 'expense', category: 'Leisure', subcategory: 'Entertainment' }
    }
    
    if (description.includes('saving') || description.includes('investment') || description.includes('401k') || description.includes('retirement')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'Long term saving' }
    }
    
    if (description.includes('medical') || description.includes('doctor') || description.includes('hospital') || description.includes('pharmacy')) {
      return { ...transaction, type: 'expense', category: 'Medical', subcategory: 'GP' }
    }
    
    // Default to Other for unrecognized expenses
    return {
      ...transaction,
      type: 'expense',
      category: 'Other',
      subcategory: 'Miscellaneous'
    }
  })
}

async function analyzeFinancialData(transactions: Transaction[], apiKey: string): Promise<FinancialMetrics> {
  // Calculate basic metrics
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const savingsTransactions = transactions
    .filter(t => t.type === 'expense' && t.category === 'Savings')
    .reduce((sum, t) => sum + t.amount, 0)

  const netWorth = savingsTransactions // Simplified - in reality would include all assets
  const incomeSurplus = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (savingsTransactions / totalIncome) * 100 : 0

  // Calculate top expense categories
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense' && t.category !== 'Savings')
    .reduce((acc, t) => {
      acc[t.category || 'Uncategorized'] = (acc[t.category || 'Uncategorized'] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  const topExpenseCategories = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / (totalExpenses - savingsTransactions)) * 100
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Calculate monthly trends (simplified)
  const monthlyTrends = calculateMonthlyTrends(transactions)

  // Generate AI insights
  const insights = await generateFinancialInsights(
    { totalIncome, totalExpenses, incomeSurplus, savingsRate, topExpenseCategories, monthlyTrends },
    apiKey
  )

  return {
    netWorth,
    totalIncome,
    totalExpenses,
    incomeSurplus,
    savingsRate,
    topExpenseCategories,
    monthlyTrends,
    insights
  }
}

function calculateMonthlyTrends(transactions: Transaction[]) {
  const monthlyData = transactions.reduce((acc, t) => {
    const month = new Date(t.date).toISOString().slice(0, 7) // YYYY-MM
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0 }
    }
    
    if (t.type === 'income') {
      acc[month].income += t.amount
    } else {
      acc[month].expenses += t.amount
    }
    
    return acc
  }, {} as Record<string, { income: number; expenses: number }>)

  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      surplus: data.income - data.expenses
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6) // Last 6 months
}

async function generateFinancialInsights(metrics: Partial<FinancialMetrics>, apiKey: string): Promise<string[]> {
  const prompt = `
Analyze the following financial data and provide 3-5 actionable insights and recommendations:

Total Income: $${metrics.totalIncome?.toFixed(2)}
Total Expenses: $${metrics.totalExpenses?.toFixed(2)}
Income Surplus: $${metrics.incomeSurplus?.toFixed(2)}
Savings Rate: ${metrics.savingsRate?.toFixed(1)}%

Top Expense Categories:
${metrics.topExpenseCategories?.map(cat => `- ${cat.category}: $${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`).join('\n')}

Monthly Trends (last 6 months):
${metrics.monthlyTrends?.map(trend => `${trend.month}: Income $${trend.income.toFixed(2)}, Expenses $${trend.expenses.toFixed(2)}, Surplus $${trend.surplus.toFixed(2)}`).join('\n')}

Provide insights as a JSON array of strings, focusing on:
1. Spending patterns and areas for improvement
2. Savings opportunities
3. Budget recommendations
4. Financial health assessment

Return only a JSON array of insight strings.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a financial advisor. Provide practical, actionable insights. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error for insights:', response.status)
      return ['Unable to generate insights at this time.']
    }

    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)

  } catch (error) {
    console.error('Error generating insights:', error)
    return ['Unable to generate insights at this time.']
  }
}