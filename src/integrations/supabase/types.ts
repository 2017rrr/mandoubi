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
      drivers: {
        Row: {
          created_at: string
          id: string
          is_available: boolean | null
          rating: number | null
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          rating?: number | null
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          rating?: number | null
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          media_url: string | null
          message: string | null
          message_type: string
          order_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          media_url?: string | null
          message?: string | null
          message_type: string
          order_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          media_url?: string | null
          message?: string | null
          message_type?: string
          order_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "available_orders_for_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean | null
          order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          order_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "available_orders_for_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          client_phone: string
          created_at: string
          delivery_address: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_type: string
          description: string | null
          driver_amount: number | null
          driver_id: string | null
          id: string
          notes: string | null
          order_number: number
          payment_status: string | null
          photo_after_url: string | null
          photo_before_url: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_time: string | null
          rating: number | null
          receipt_url: string | null
          status: string
          store_id: string
        }
        Insert: {
          amount: number
          client_phone: string
          created_at?: string
          delivery_address: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_type: string
          description?: string | null
          driver_amount?: number | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_status?: string | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_time?: string | null
          rating?: number | null
          receipt_url?: string | null
          status?: string
          store_id: string
        }
        Update: {
          amount?: number
          client_phone?: string
          created_at?: string
          delivery_address?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_type?: string
          description?: string | null
          driver_amount?: number | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_status?: string | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_time?: string | null
          rating?: number | null
          receipt_url?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_stats"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string
          id: string
          location_text: string | null
          store_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_text?: string | null
          store_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_text?: string | null
          store_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          telegram_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          telegram_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          telegram_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "telegram_chat_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "available_orders_for_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_chat_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          telegram_id: number | null
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string
          id?: string
          telegram_id?: number | null
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          telegram_id?: number | null
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_sessions: {
        Row: {
          data: Json | null
          id: string
          state: string
          telegram_id: number
          updated_at: string
        }
        Insert: {
          data?: Json | null
          id?: string
          state?: string
          telegram_id: number
          updated_at?: string
        }
        Update: {
          data?: Json | null
          id?: string
          state?: string
          telegram_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          created_at: string
          id: string
          is_linked: boolean | null
          phone: string | null
          role: string | null
          telegram_id: number
          telegram_username: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_linked?: boolean | null
          phone?: string | null
          role?: string | null
          telegram_id: number
          telegram_username?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_linked?: boolean | null
          phone?: string | null
          role?: string | null
          telegram_id?: number
          telegram_username?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      available_orders_for_drivers: {
        Row: {
          amount: number | null
          client_phone: string | null
          created_at: string | null
          delivery_address: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_type: string | null
          description: string | null
          driver_amount: number | null
          id: string | null
          notes: string | null
          order_number: number | null
          payment_status: string | null
          photo_after_url: string | null
          photo_before_url: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_time: string | null
          rating: number | null
          receipt_url: string | null
          status: string | null
          store_id: string | null
        }
        Insert: {
          amount?: number | null
          client_phone?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_type?: string | null
          description?: string | null
          driver_amount?: number | null
          id?: string | null
          notes?: string | null
          order_number?: number | null
          payment_status?: string | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_time?: string | null
          rating?: number | null
          receipt_url?: string | null
          status?: string | null
          store_id?: string | null
        }
        Update: {
          amount?: number | null
          client_phone?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_type?: string | null
          description?: string | null
          driver_amount?: number | null
          id?: string | null
          notes?: string | null
          order_number?: number | null
          payment_status?: string | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_time?: string | null
          rating?: number | null
          receipt_url?: string | null
          status?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_stats"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_stats: {
        Row: {
          completed_orders: number | null
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          is_available: boolean | null
          rating: number | null
          total_earnings: number | null
          total_orders: number | null
          vehicle_type: string | null
        }
        Relationships: []
      }
      store_stats: {
        Row: {
          avg_order_value: number | null
          completed_orders: number | null
          store_id: string | null
          store_name: string | null
          store_phone: string | null
          total_orders: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      driver_accept_order: { Args: { order_id: string }; Returns: undefined }
      driver_accept_order_by_user: {
        Args: { driver_user_id: string; order_id: string }
        Returns: undefined
      }
      generate_telegram_link_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_admin_ids: {
        Args: never
        Returns: {
          id: string
        }[]
      }
      get_user_ids_by_role: {
        Args: { target_role: string }
        Returns: {
          id: string
        }[]
      }
      has_driver_profile: { Args: { _user_id: string }; Returns: boolean }
      has_store_profile: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      send_chat_message_from_bot: {
        Args: {
          p_message: string
          p_order_id: string
          p_sender_role: string
          p_sender_user_id: string
        }
        Returns: undefined
      }
      send_telegram_notification: {
        Args: { msg: string; tg_chat_id: number }
        Returns: undefined
      }
      update_order_status_by_driver: {
        Args: { driver_user_id: string; new_status: string; order_id: string }
        Returns: undefined
      }
      verify_telegram_link_code: {
        Args: { p_code: string; p_telegram_id: number }
        Returns: {
          name: string
          phone: string
          role: string
          user_id: string
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
