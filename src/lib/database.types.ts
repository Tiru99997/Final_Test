export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          user_id: string
          date: string
          category: string
          subcategory: string
          amount: number
          description: string | null
          type: 'income' | 'expense'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          category: string
          subcategory: string
          amount: number
          description?: string | null
          type: 'income' | 'expense'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          category?: string
          subcategory?: string
          amount?: number
          description?: string | null
          type?: 'income' | 'expense'
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          amount: number
          month: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          amount: number
          month: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          amount?: number
          month?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}