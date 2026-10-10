export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      guests: {
        Row: {
          id: string
          ticket_id: string
          buyer_id: string
          guest_name: string
          guest_email: string
          guest_cpf: string
          guest_phone: string | null
          is_claimed: boolean | null
          has_been_edited: boolean | null
          claimed_by_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          buyer_id: string
          guest_name: string
          guest_email: string
          guest_cpf: string
          guest_phone?: string | null
          is_claimed?: boolean | null
          has_been_edited?: boolean | null
          claimed_by_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          buyer_id?: string
          guest_name?: string
          guest_email?: string
          guest_cpf?: string
          guest_phone?: string | null
          is_claimed?: boolean | null
          has_been_edited?: boolean | null
          claimed_by_user_id?: string | null
          created_at?: string
          }
        Relationships: [
          {
            foreignKeyName: "guests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }

      coupons: {
        Row: {
          id: string;
          code: string;
          event_id: string | null;
          producer_id: string | null;
          discount_type: "percentage" | "fixed";
          discount_value: number;
          max_uses: number | null;
          used_count: number | null;
          expires_at: string | null;
          created_at: string | null;
          is_casadinha_only: boolean | null;
        };
        Insert: {
          id?: string;
          code: string;
          event_id?: string | null;
          producer_id?: string | null;
          discount_type: "percentage" | "fixed";
          discount_value: number;
          max_uses?: number | null;
          used_count?: number | null;
          expires_at?: string | null;
          created_at?: string | null;
          is_casadinha_only?: boolean | null;
        };
        Update: {
          id?: string;
          code?: string;
          event_id?: string | null;
          producer_id?: string | null;
          discount_type?: "percentage" | "fixed";
          discount_value?: number;
          max_uses?: number | null;
          used_count?: number | null;
          expires_at?: string | null;
          created_at?: string | null;
          is_casadinha_only?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "coupons_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupons_producer_id_fkey";
            columns: ["producer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      events: {
        Row: {
          producer_id: string | null;
          id: string;
          title: string;
          description: string | null;
          event_date: string;
          price: number;
          total_spots: number;
          image_url: string | null;
          created_at: string | null;
        };
        Insert: {
          producer_id?: string | null;
          id?: string;
          title: string;
          description?: string | null;
          event_date: string;
          price: number;
          total_spots: number;
          image_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          producer_id?: string | null;
          id?: string;
          title?: string;
          description?: string | null;
          event_date?: string;
          price?: number;
          total_spots?: number;
          image_url?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          cpf: string | null;
          phone: string | null;
          semester: string | null;
          enrollment_number: string | null;
          role: 'admin' | 'producer' | 'agent' | 'customer' | null;
          producer_id: string | null;
          birth_date: string | null;
          university: string | null;
          course: string | null;
          created_at: string | number | Date | null;
          status: string | null;
          deletion_scheduled_at: string | null;
          profile_type: 'PF' | 'PJ' | null;
          cnpj: string | null;
          company_name: string | null;
          trading_name: string | null;
          mp_access_token: string | null;
          mp_refresh_token: string | null;
          mp_user_id: string | null;
          mp_public_key: string | null;
        };
        Insert: {
          id: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          cpf?: string | null;
          phone?: string | null;
          semester?: string | null;
          enrollment_number?: string | null;
          role?: 'admin' | 'producer' | 'agent' | 'customer' | null;
          producer_id?: string | null;
          birth_date?: string | null;
          university?: string | null;
          course?: string | null;
          status?: string | null;
          deletion_scheduled_at?: string | null;
          profile_type?: 'PF' | 'PJ' | null;
          cnpj?: string | null;
          company_name?: string | null;
          trading_name?: string | null;
          mp_access_token?: string | null;
          mp_refresh_token?: string | null;
          mp_user_id?: string | null;
          mp_public_key?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          cpf?: string | null;
          phone?: string | null;
          semester?: string | null;
          enrollment_number?: string | null;
          role?: 'admin' | 'producer' | 'agent' | 'customer' | null;
          producer_id?: string | null;
          birth_date?: string | null;
          university?: string | null;
          course?: string | null;
          status?: string | null;
          deletion_scheduled_at?: string | null;
          profile_type?: 'PF' | 'PJ' | null;
          cnpj?: string | null;
          company_name?: string | null;
          trading_name?: string | null;
          mp_access_token?: string | null;
          mp_refresh_token?: string | null;
          mp_user_id?: string | null;
          mp_public_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      tickets: {
        Row: {
          id: string;
          event_id: string;
          user_id: string | null;
          coupon_id: string | null;
          buyer_name: string;
          buyer_email: string;
          payment_status: string | null;
          is_used: boolean | null;
          quantity: number;
          created_at: string | null;
          pix_qr_code: string | null;
          pix_qr_code_base64: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id?: string | null;
          coupon_id?: string | null;
          buyer_name: string;
          buyer_email: string;
          payment_status?: string | null;
          is_used?: boolean | null;
          quantity?: number;
          created_at?: string | null;
          pix_qr_code?: string | null;
          pix_qr_code_base64?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string | null;
          coupon_id?: string | null;
          buyer_name?: string;
          buyer_email?: string;
          payment_status?: string | null;
          is_used?: boolean | null;
          quantity?: number;
          created_at?: string | null;
          pix_qr_code?: string | null;
          pix_qr_code_base64?: string | null;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_email_exists: {
        Args: {
          lookup_email: string;
        };
        Returns: boolean;
      };
      check_cpf_exists: {
        Args: {
          lookup_cpf: string;
        };
        Returns: string | null;
      };
      verify_cpf_email_match: {
        Args: {
          p_cpf: string;
          p_email: string;
        };
        Returns: boolean;
      };
      is_ticket_manager: {
        Args: {
          p_event_id: string;
        };
        Returns: boolean;
      };
      increment_coupon_usage: {
        Args: {
          p_coupon_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;