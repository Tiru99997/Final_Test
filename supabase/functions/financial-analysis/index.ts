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
  action: 'categorize' | 'analyze' | 'categorize-savings'
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
    } else if (action === 'categorize-savings') {
      // Categorize savings transactions
      const categorizedSavings = await categorizeSavingsTransactions(transactions, openaiApiKey)
      
      return new Response(
        JSON.stringify({ categorizedSavings }),
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
- Living Expenses (Grocery, Maids, Fruits & Vegetables, Food, Household Items, Utilities, Electricity, Gas, Water, Internet, Phone, Personal Care, Toiletries, Laundry, Kitchen Supplies)
- Rental (House Rent, Apartment Rent, Office Rent, Parking Rent, Storage Rent, Equipment Rent)
- Debt (Car Loan, Home Loan, Personal Loan, Credit Card Payment, Student Loan, Business Loan, EMI, Interest Payment)
- Education (School Fees, Tuition, College Fees, Training, Courses, Books, Educational Materials, Exam Fees, Coaching)
- Healthcare (Medical Bills, Doctor Consultation, Medicine, Hospital, Dental, Health Insurance, Lab Tests, Surgery, Therapy)
- Transportation (Fuel, Car Maintenance, Public Transport, Taxi, Uber, Bus, Train, Flight, Car Insurance, Vehicle Registration)
- Entertainment (Movies, Dining Out, Vacation, Sports, Hobbies, Subscriptions, Netflix, Spotify, Gaming, Books)
- Shopping (Clothes, Electronics, Gifts, Jewelry, Furniture, Home Decor, Appliances, Personal Items)
- Insurance (Life Insurance, Health Insurance, Car Insurance, Home Insurance, Travel Insurance, Professional Insurance)
- Taxes (Income Tax, Property Tax, GST, Professional Tax, Vehicle Tax, Other Taxes)
- Charity (Donations, Religious Contributions, NGO Support, Community Support)
- Savings (SIPs, Fixed Deposits, Recurring Deposits, Emergency Fund, Investment Savings, Retirement Savings)
- Other (Miscellaneous, Bank Charges, Legal Fees, Professional Services, Repairs, Maintenance)

INCOME CATEGORIES:
- Salary (Salary, Wages, Bonus, Overtime, Commission, Tips, Freelance Income, Consulting Income)
- Dividend (Dividends, Interest, Capital Gains, Mutual Fund Returns, Stock Profits, Bond Interest, Crypto Gains)
- Rental Income (Property Rent, Room Rent, Commercial Rent, Parking Rent, Equipment Rental, Airbnb Income)
- Business (Business Profits, Partnership Income, Royalties, Licensing, Product Sales, Service Income)
- Other (Gifts, Inheritance, Insurance Claims, Refunds, Cashback, Prize Money, Government Benefits, Pension)

Transactions to categorize:
${batch.map(t => `- ${t.description} ($${t.amount}) [${t.type}]`).join('\n')}

Rules:
1. Determine if each transaction is "income" or "expense" based on the description
2. Choose the most appropriate category and subcategory
3. Salary, dividend, rental income -> Salary, Dividend, Rental Income respectively
4. House rent -> Rental category
5. Grocery, maids, fruits & vegetables -> Living Expenses
6. Car loan and home loan -> Debt category
7. School fees and tuition -> Education category
8. SIPs should be categorized as Savings (this represents income minus all expenses)
9. Use specific subcategories that match the transaction description closely

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

async function categorizeSavingsTransactions(transactions: Transaction[], apiKey: string): Promise<any[]> {
  if (!apiKey) {
    // Fallback categorization for savings
    return transactions.map(t => {
      const description = t.description?.toLowerCase() || '';
      
      if (description.includes('sip') || description.includes('systematic')) {
        return { category: 'SIP' };
      } else if (description.includes('mutual fund') || description.includes('mf')) {
        return { category: 'Mutual Fund' };
      } else if (description.includes('stock') || description.includes('equity')) {
        return { category: 'Stocks' };
      } else if (description.includes('fd') || description.includes('fixed deposit')) {
        return { category: 'FD' };
      } else if (description.includes('rd') || description.includes('recurring deposit')) {
        return { category: 'RD' };
      } else if (description.includes('aif') || description.includes('alternative investment')) {
        return { category: 'AIF' };
      } else {
        return { category: 'Other Savings' };
      }
    });
  }

  const prompt = `
Categorize the following savings/investment transactions into these specific categories:
- SIP (Systematic Investment Plan)
- Mutual Fund (Direct mutual fund investments)
- Stocks (Direct stock/equity investments)
- FD (Fixed Deposits)
- RD (Recurring Deposits)  
- AIF (Alternative Investment Funds)
- Other Savings (Any other savings not fitting above categories)

Transactions to categorize:
${transactions.map(t => `- ${t.description} ($${t.amount})`).join('\n')}

Rules:
1. SIP for systematic investment plans, monthly SIPs
2. Mutual Fund for direct mutual fund investments (not SIPs)
3. Stocks for direct stock purchases, equity investments
4. FD for fixed deposits, term deposits
5. RD for recurring deposits
6. AIF for alternative investment funds, hedge funds, etc.
7. Other Savings for any savings not fitting the above

Return a JSON array with the same order, each containing:
{
  "category": "category_name"
}

Only return the JSON array, no other text.`;

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
            content: 'You are a financial categorization expert for savings and investments. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error for savings categorization:', response.status);
      return transactions.map(() => ({ category: 'Other Savings' }));
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);

  } catch (error) {
    console.error('Error categorizing savings:', error);
    return transactions.map(() => ({ category: 'Other Savings' }));
  }
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
      if (description.includes('salary') || description.includes('wage') || description.includes('bonus')) {
        return { ...transaction, type: 'income', category: 'Salary', subcategory: 'Salary' }
      }
      if (description.includes('dividend') || description.includes('interest')) {
        return { ...transaction, type: 'income', category: 'Dividend', subcategory: 'Dividends' }
      }
      if (description.includes('rent income') || description.includes('rental income')) {
        return { ...transaction, type: 'income', category: 'Rental Income', subcategory: 'Property Rent' }
      }
      return {
        ...transaction,
        type: 'income',
        category: 'Salary',
        subcategory: 'Salary'
      }
    }
    
    // Expense categorization
    if (description.includes('grocery') || description.includes('maids') || description.includes('fruits') || description.includes('vegetables') || description.includes('food')) {
      return { ...transaction, type: 'expense', category: 'Living Expenses', subcategory: 'Grocery' }
    }
    
    if (description.includes('house rent') || description.includes('rent')) {
      return { ...transaction, type: 'expense', category: 'Rental', subcategory: 'House Rent' }
    }
    
    if (description.includes('car loan') || description.includes('home loan') || description.includes('loan') || description.includes('emi')) {
      return { ...transaction, type: 'expense', category: 'Debt', subcategory: 'Car Loan' }
    }
    
    if (description.includes('school fees') || description.includes('tuition') || description.includes('education')) {
      return { ...transaction, type: 'expense', category: 'Education', subcategory: 'School Fees' }
    }
    
    if (description.includes('sip') || description.includes('sips')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'SIPs' }
    }
    
    if (description.includes('gas') || description.includes('uber') || description.includes('taxi') || description.includes('bus')) {
      return { ...transaction, type: 'expense', category: 'Transportation', subcategory: 'Taxi' }
    }
    
    if (description.includes('movie') || description.includes('netflix') || description.includes('spotify') || description.includes('entertainment') || description.includes('vacation') || description.includes('holiday') || description.includes('restaurant') || description.includes('dining')) {
      return { ...transaction, type: 'expense', category: 'Entertainment', subcategory: 'Movies' }
    }
    
    if (description.includes('medical') || description.includes('doctor') || description.includes('hospital') || description.includes('pharmacy') || description.includes('medicine')) {
      return { ...transaction, type: 'expense', category: 'Healthcare', subcategory: 'Medical Bills' }
    }
    
    if (description.includes('utilities') || description.includes('electricity') || description.includes('water') || description.includes('gas bill')) {
      return { ...transaction, type: 'expense', category: 'Living Expenses', subcategory: 'Utilities' }
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