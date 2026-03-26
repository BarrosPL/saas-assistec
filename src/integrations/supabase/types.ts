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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      company_settings: {
        Row: {
          address: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          sale_id: string | null
          service_order_id: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          sale_id?: string | null
          service_order_id?: string | null
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          sale_id?: string | null
          service_order_id?: string | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_model: string | null
          category: string
          cost_price: number
          created_at: string
          id: string
          internal_code: string | null
          min_stock: number
          name: string
          quantity: number
          sale_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_model?: string | null
          category: string
          cost_price?: number
          created_at?: string
          id?: string
          internal_code?: string | null
          min_stock?: number
          name: string
          quantity?: number
          sale_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_model?: string | null
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          internal_code?: string | null
          min_stock?: number
          name?: string
          quantity?: number
          sale_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_super_admin: boolean | null
          is_banned: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_super_admin?: boolean | null
          is_banned?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_super_admin?: boolean | null
          is_banned?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          items: Json
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_number: number
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          items?: Json
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_number?: number
          subtotal?: number
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          items?: Json
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_number?: number
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_history: {
        Row: {
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes: string | null
          previous_status: Database["public"]["Enums"]["order_status"] | null
          service_order_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          service_order_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          service_order_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_history_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_signature: string | null
          device_brand: string
          device_condition: Json | null
          device_imei: string | null
          device_model: string
          device_password: string | null
          device_powered_on: boolean | null
          device_received_at: string | null
          estimated_deadline: string | null
          id: string
          notes: string | null
          order_number: number
          reported_issue: string
          service_value: number | null
          status: Database["public"]["Enums"]["order_status"]
          technician: string | null
          technician_signature: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_signature?: string | null
          device_brand: string
          device_condition?: Json | null
          device_imei?: string | null
          device_model: string
          device_password?: string | null
          device_powered_on?: boolean | null
          device_received_at?: string | null
          estimated_deadline?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          reported_issue: string
          service_value?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          technician?: string | null
          technician_signature?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_signature?: string | null
          device_brand?: string
          device_condition?: Json | null
          device_imei?: string | null
          device_model?: string
          device_password?: string | null
          device_powered_on?: boolean | null
          device_received_at?: string | null
          estimated_deadline?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          reported_issue?: string
          service_value?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          technician?: string | null
          technician_signature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          product_id: string
          quantity: number
          reason: string | null
          service_order_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          product_id: string
          quantity: number
          reason?: string | null
          service_order_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          product_id?: string
          quantity?: number
          reason?: string | null
          service_order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_tenant_admin: {
        Args: {
          admin_email: string
          admin_password: string
          admin_name: string
          admin_company: string
        }
        Returns: { success: boolean, message: string }
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "technician" | "attendant"
      order_status:
        | "open"
        | "diagnosis"
        | "waiting_parts"
        | "repairing"
        | "completed"
        | "cancelled"
      payment_method: "cash" | "pix" | "credit_card" | "debit_card"
      stock_movement_type: "entry" | "exit"
      transaction_type: "income" | "expense"
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
    Enums: {
      app_role: ["owner", "technician", "attendant"],
      order_status: [
        "open",
        "diagnosis",
        "waiting_parts",
        "repairing",
        "completed",
        "cancelled",
      ],
      payment_method: ["cash", "pix", "credit_card", "debit_card"],
      stock_movement_type: ["entry", "exit"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
