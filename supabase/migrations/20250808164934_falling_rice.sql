/*
  # Budget Tracker Database Schema

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `date` (date)
      - `category` (text)
      - `subcategory` (text)
      - `amount` (decimal)
      - `description` (text, optional)
      - `type` (text, 'income' or 'expense')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `budgets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `category` (text)
      - `amount` (decimal)
      - `month` (text, format: YYYY-MM)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  category text NOT NULL,
  subcategory text NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text DEFAULT '',
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  amount decimal(10,2) NOT NULL,
  month text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category, month)
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for budgets
CREATE POLICY "Users can view own budgets"
  ON budgets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions(category);
CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON budgets(user_id);
CREATE INDEX IF NOT EXISTS budgets_month_idx ON budgets(month);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();