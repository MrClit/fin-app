export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          aspsp_country: string | null
          aspsp_name: string | null
          balance: number | null
          color: string | null
          consent_expires_at: string | null
          consent_reminder_sent_for: string | null
          created_at: string | null
          currency: string | null
          external_id: string | null
          household_id: string
          iban: string | null
          id: string
          is_active: boolean | null
          is_liability: boolean | null
          last_synced: string | null
          name: string
          number: string | null
          session_id: string | null
          sort_order: number
          source: string
          type: string
          user_id: string
        }
        Insert: {
          aspsp_country?: string | null
          aspsp_name?: string | null
          balance?: number | null
          color?: string | null
          consent_expires_at?: string | null
          consent_reminder_sent_for?: string | null
          created_at?: string | null
          currency?: string | null
          external_id?: string | null
          household_id: string
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_liability?: boolean | null
          last_synced?: string | null
          name: string
          number?: string | null
          session_id?: string | null
          sort_order?: number
          source: string
          type: string
          user_id: string
        }
        Update: {
          aspsp_country?: string | null
          aspsp_name?: string | null
          balance?: number | null
          color?: string | null
          consent_expires_at?: string | null
          consent_reminder_sent_for?: string | null
          created_at?: string | null
          currency?: string | null
          external_id?: string | null
          household_id?: string
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_liability?: boolean | null
          last_synced?: string | null
          name?: string
          number?: string | null
          session_id?: string | null
          sort_order?: number
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          id: string
          name: string
          sort_order: number
          type: string
        }
        Insert: {
          color: string
          id: string
          name: string
          sort_order?: number
          type: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      categorization_rules: {
        Row: {
          category_id: string
          created_at: string
          field: string
          household_id: string
          id: string
          is_active: boolean
          pattern: string
          priority: number
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          field: string
          household_id: string
          id?: string
          is_active?: boolean
          pattern: string
          priority?: number
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          field?: string
          household_id?: string
          id?: string
          is_active?: boolean
          pattern?: string
          priority?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          context: Json | null
          created_at: string | null
          household_id: string | null
          id: string
          message: string
          route: string | null
          source: string
          stack: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          household_id?: string | null
          id?: string
          message: string
          route?: string | null
          source: string
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          household_id?: string | null
          id?: string
          message?: string
          route?: string | null
          source?: string
          stack?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string | null
          household_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          household_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          household_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          id: string
          month_start_day: number | null
          name: string
          primary_currency: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_start_day?: number | null
          name?: string
          primary_currency?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          month_start_day?: number | null
          name?: string
          primary_currency?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string | null
          read_at: string | null
          source: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string | null
          read_at?: string | null
          source?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string | null
          read_at?: string | null
          source?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          household_id: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          household_id: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          household_id?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          category_manual: string | null
          created_at: string | null
          date: string
          description: string
          external_id: string | null
          household_id: string
          id: string
          is_read: boolean
          notes: string | null
          source: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          category_manual?: string | null
          created_at?: string | null
          date: string
          description: string
          external_id?: string | null
          household_id: string
          id?: string
          is_read?: boolean
          notes?: string | null
          source: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          category_manual?: string | null
          created_at?: string | null
          date?: string
          description?: string
          external_id?: string | null
          household_id?: string
          id?: string
          is_read?: boolean
          notes?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_manual_fkey"
            columns: ["category_manual"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      user_config: {
        Row: {
          created_at: string | null
          household_id: string
          month_start_day: number | null
          primary_currency: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          household_id: string
          month_start_day?: number | null
          primary_currency?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          household_id?: string
          month_start_day?: number | null
          primary_currency?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_config_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_household_ids: { Args: never; Returns: string[] }
      current_owner_household_ids: { Args: never; Returns: string[] }
      get_period_data: {
        Args: {
          p_end_date: string
          p_household_id: string
          p_start_date: string
        }
        Returns: {
          by_category: Json
          expense: number
          income: number
          savings: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
