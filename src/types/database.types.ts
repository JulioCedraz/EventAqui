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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_deletion_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          event_id: string
          expires_at: string | null
          id: string
          is_casadinha_only: boolean | null
          max_uses: number | null
          producer_id: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          event_id: string
          expires_at?: string | null
          id?: string
          is_casadinha_only?: boolean | null
          max_uses?: number | null
          producer_id?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          event_id?: string
          expires_at?: string | null
          id?: string
          is_casadinha_only?: boolean | null
          max_uses?: number | null
          producer_id?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string | null
          id: string
          image_url: string | null
          price: number
          producer_id: string | null
          title: string
          total_spots: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          price?: number
          producer_id?: string | null
          title: string
          total_spots?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          price?: number
          producer_id?: string | null
          title?: string
          total_spots?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          buyer_id: string
          claimed_by_user_id: string | null
          created_at: string
          guest_cpf: string
          guest_email: string
          guest_name: string
          guest_phone: string | null
          has_been_edited: boolean | null
          id: string
          is_claimed: boolean | null
          ticket_id: string
        }
        Insert: {
          buyer_id: string
          claimed_by_user_id?: string | null
          created_at?: string
          guest_cpf: string
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          has_been_edited?: boolean | null
          id?: string
          is_claimed?: boolean | null
          ticket_id: string
        }
        Update: {
          buyer_id?: string
          claimed_by_user_id?: string | null
          created_at?: string
          guest_cpf?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          has_been_edited?: boolean | null
          id?: string
          is_claimed?: boolean | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          course: string | null
          cpf: string | null
          created_at: string | null
          deletion_scheduled_at: string | null
          email: string
          enrollment_number: string | null
          first_name: string | null
          full_name: string | null
          id: string
          infinitepay_api_key_enc: string | null
          infinitepay_handle: string | null
          last_name: string | null
          mp_access_token: string | null
          mp_public_key: string | null
          mp_refresh_token: string | null
          mp_user_id: string | null
          phone: string | null
          producer_id: string | null
          role: string | null
          semester: string | null
          status: string | null
          university: string | null
        }
        Insert: {
          birth_date?: string | null
          course?: string | null
          cpf?: string | null
          created_at?: string | null
          deletion_scheduled_at?: string | null
          email: string
          enrollment_number?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          infinitepay_api_key_enc?: string | null
          infinitepay_handle?: string | null
          last_name?: string | null
          mp_access_token?: string | null
          mp_public_key?: string | null
          mp_refresh_token?: string | null
          mp_user_id?: string | null
          phone?: string | null
          producer_id?: string | null
          role?: string | null
          semester?: string | null
          status?: string | null
          university?: string | null
        }
        Update: {
          birth_date?: string | null
          course?: string | null
          cpf?: string | null
          created_at?: string | null
          deletion_scheduled_at?: string | null
          email?: string
          enrollment_number?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          infinitepay_api_key_enc?: string | null
          infinitepay_handle?: string | null
          last_name?: string | null
          mp_access_token?: string | null
          mp_public_key?: string | null
          mp_refresh_token?: string | null
          mp_user_id?: string | null
          phone?: string | null
          producer_id?: string | null
          role?: string | null
          semester?: string | null
          status?: string | null
          university?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          amount_cents: number | null
          buyer_email: string
          buyer_name: string
          checkout_url: string | null
          coupon_id: string | null
          created_at: string | null
          event_id: string
          expires_at: string | null
          id: string
          installments: number | null
          invoice_slug: string | null
          is_used: boolean | null
          paid_amount_cents: number | null
          payment_method: string | null
          payment_status: string | null
          quantity: number
          receipt_url: string | null
          refund_requested_at: string | null
          transaction_nsu: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          buyer_email: string
          buyer_name: string
          checkout_url?: string | null
          coupon_id?: string | null
          created_at?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          installments?: number | null
          invoice_slug?: string | null
          is_used?: boolean | null
          paid_amount_cents?: number | null
          payment_method?: string | null
          payment_status?: string | null
          quantity?: number
          receipt_url?: string | null
          refund_requested_at?: string | null
          transaction_nsu?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          buyer_email?: string
          buyer_name?: string
          checkout_url?: string | null
          coupon_id?: string | null
          created_at?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          installments?: number | null
          invoice_slug?: string | null
          is_used?: boolean | null
          paid_amount_cents?: number | null
          payment_method?: string | null
          payment_status?: string | null
          quantity?: number
          receipt_url?: string | null
          refund_requested_at?: string | null
          transaction_nsu?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_ticket: { Args: { p_ticket_id: string }; Returns: boolean }
      can_read_coupon: { Args: { p_coupon_id: string }; Returns: boolean }
      get_user_role: { Args: never; Returns: string }
      increment_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_end_user_request: { Args: never; Returns: boolean }
      is_guest_claimer: { Args: { p_ticket_id: string }; Returns: boolean }
      is_ticket_manager: { Args: { p_event_id: string }; Returns: boolean }
      purge_deleted_accounts: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
