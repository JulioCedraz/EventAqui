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
          first_name: string | null;
          last_name: string | null;
          cpf: string | null;
          occupation: string | null;
          birth_date: string | null;
          university: string | null;
          course: string | null;
          area: string | null;
          specialty: string | null;
          role: 'admin' | 'producer' | 'agent' | 'customer' | null;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          cpf?: string | null;
          occupation?: string | null;
          birth_date?: string | null;
          university?: string | null;
          course?: string | null;
          area?: string | null;
          specialty?: string | null;
          role?: 'admin' | 'producer' | 'agent' | 'customer' | null;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          cpf?: string | null;
          occupation?: string | null;
          birth_date?: string | null;
          university?: string | null;
          course?: string | null;
          area?: string | null;
          specialty?: string | null;
          role?: 'admin' | 'producer' | 'agent' | 'customer' | null;
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
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      agents: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          producer_id: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          producer_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          producer_id?: string | null;
        };
        Relationships: [];
      };

      producers: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
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
