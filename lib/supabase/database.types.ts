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
      client_users: {
        Row: {
          active: boolean;
          client_id: string;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_primary: boolean;
          login_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          client_id: string;
          created_at?: string;
          email: string;
          full_name: string;
          id?: string;
          is_primary?: boolean;
          login_id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          client_id?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_primary?: boolean;
          login_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_users_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          account_exec_id: string | null;
          baseline: NonNullable<Json>;
          client_code: string;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_role: string | null;
          created_at: string;
          decision_maker: string | null;
          end_date: string | null;
          expectation_notes: string | null;
          id: string;
          industry: string | null;
          main_goal: Database["public"]["Enums"]["goal_category"] | null;
          monthly_fee: number | null;
          name: string;
          notes: string | null;
          pillar_mix: NonNullable<Json>;
          platforms: string[];
          reminders_enabled: boolean;
          service_id: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["client_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_exec_id?: string | null;
          baseline?: NonNullable<Json>;
          client_code?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_role?: string | null;
          created_at?: string;
          decision_maker?: string | null;
          end_date?: string | null;
          expectation_notes?: string | null;
          id?: string;
          industry?: string | null;
          main_goal?: Database["public"]["Enums"]["goal_category"] | null;
          monthly_fee?: number | null;
          name: string;
          notes?: string | null;
          pillar_mix?: NonNullable<Json>;
          platforms?: string[];
          reminders_enabled?: boolean;
          service_id?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
        };
        Update: {
          account_exec_id?: string | null;
          baseline?: NonNullable<Json>;
          client_code?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_role?: string | null;
          created_at?: string;
          decision_maker?: string | null;
          end_date?: string | null;
          expectation_notes?: string | null;
          id?: string;
          industry?: string | null;
          main_goal?: Database["public"]["Enums"]["goal_category"] | null;
          monthly_fee?: number | null;
          name?: string;
          notes?: string | null;
          pillar_mix?: NonNullable<Json>;
          platforms?: string[];
          reminders_enabled?: boolean;
          service_id?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_account_exec_id_fkey";
            columns: ["account_exec_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string;
          author_kind: string;
          body: string;
          client_id: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          visible_to_client: boolean;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          author_kind: string;
          body: string;
          client_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          visible_to_client?: boolean;
        };
        Update: {
          author_id?: string;
          author_kind?: string;
          body?: string;
          client_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          visible_to_client?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "comments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      document_counters: {
        Row: {
          doc_type: string;
          last_number: number;
          updated_at: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          doc_type: string;
          last_number?: number;
          updated_at?: string;
          year: number;
        };
        Update: {
          doc_type?: string;
          last_number?: number;
          updated_at?: string;
          year?: number;
        };
        Relationships: [];
      };
      login_attempts: {
        Row: {
          created_at: string;
          id: string;
          ip: string | null;
          login_id: string;
          succeeded: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          ip?: string | null;
          login_id: string;
          succeeded: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip?: string | null;
          login_id?: string;
          succeeded?: boolean;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          active: boolean;
          avatar_path: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["staff_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          avatar_path?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          avatar_path?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          inclusions: NonNullable<Json>;
          is_retainer: boolean;
          name: string;
          price: number;
          sort: number;
          unit: Database["public"]["Enums"]["service_unit"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          inclusions?: NonNullable<Json>;
          is_retainer?: boolean;
          name: string;
          price: number;
          sort?: number;
          unit: Database["public"]["Enums"]["service_unit"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          inclusions?: NonNullable<Json>;
          is_retainer?: boolean;
          name?: string;
          price?: number;
          sort?: number;
          unit?: Database["public"]["Enums"]["service_unit"];
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          address: string | null;
          bank_details: NonNullable<Json>;
          company_name: string;
          created_at: string;
          email: string | null;
          id: number;
          invoice_footer: string | null;
          legal_name: string | null;
          logo_path: string | null;
          max_active_clients: number;
          payment_terms_days: number;
          phone: string | null;
          profit_threshold_per_hour: number;
          reminders_enabled: boolean;
          updated_at: string;
          vat_number: string | null;
          vat_rate: number;
          vat_registered: boolean;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          bank_details?: NonNullable<Json>;
          company_name?: string;
          created_at?: string;
          email?: string | null;
          id?: number;
          invoice_footer?: string | null;
          legal_name?: string | null;
          logo_path?: string | null;
          max_active_clients?: number;
          payment_terms_days?: number;
          phone?: string | null;
          profit_threshold_per_hour?: number;
          reminders_enabled?: boolean;
          updated_at?: string;
          vat_number?: string | null;
          vat_rate?: number;
          vat_registered?: boolean;
        };
        Update: {
          address?: string | null;
          bank_details?: NonNullable<Json>;
          company_name?: string;
          created_at?: string;
          email?: string | null;
          id?: number;
          invoice_footer?: string | null;
          legal_name?: string | null;
          logo_path?: string | null;
          max_active_clients?: number;
          payment_terms_days?: number;
          phone?: string | null;
          profit_threshold_per_hour?: number;
          reminders_enabled?: boolean;
          updated_at?: string;
          vat_number?: string | null;
          vat_rate?: number;
          vat_registered?: boolean;
        };
        Relationships: [];
      };
      status_events: {
        Row: {
          actor_id: string | null;
          actor_kind: string;
          client_id: string;
          comment: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          from_status: string | null;
          id: string;
          to_status: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          actor_kind: string;
          client_id: string;
          comment?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          from_status?: string | null;
          id?: string;
          to_status: string;
        };
        Update: {
          actor_id?: string | null;
          actor_kind?: string;
          client_id?: string;
          comment?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          from_status?: string | null;
          id?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "status_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "status_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      portal_client: {
        Row: {
          account_exec_email: string | null;
          account_exec_name: string | null;
          client_code: string | null;
          id: string | null;
          monthly_fee: number | null;
          name: string | null;
          platforms: string[] | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["client_status"] | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      auth_role: { Args: Record<PropertyKey, never>; Returns: string };
      can_access_client: { Args: { p_client_id: string }; Returns: boolean };
      client_code_letters: { Args: { p_name: string }; Returns: string };
      client_login_locked: { Args: { p_login_id: string }; Returns: boolean };
      is_ceo: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_trusted_caller: { Args: Record<PropertyKey, never>; Returns: boolean };
      pillar_mix_total: { Args: { mix: Json }; Returns: number };
    };
    Enums: {
      campaign_status: "draft" | "sent" | "approved" | "live" | "complete";
      client_status: "lead_won" | "onboarding" | "active" | "paused" | "ended";
      goal_category: "visibility" | "credibility" | "engagement" | "results";
      invoice_status: "draft" | "issued" | "part_paid" | "paid" | "credited";
      item_format:
        "post" | "story" | "reel" | "ad_feed" | "ad_story" | "ad_variant";
      lead_source:
        | "referral"
        | "website"
        | "facebook"
        | "instagram"
        | "linkedin"
        | "walk_in"
        | "event"
        | "other";
      lead_stage: "new" | "contacted" | "quote_sent" | "won" | "lost";
      metric_source: "manual" | "meta" | "ga4";
      pillar:
        | "showcase"
        | "educate"
        | "proof"
        | "behind_the_scenes"
        | "engage"
        | "campaign";
      plan_status: "draft" | "sent" | "approved";
      quote_status: "draft" | "sent" | "accepted" | "declined" | "expired";
      service_unit: "monthly" | "once_off" | "hourly" | "per_item";
      staff_role: "ceo" | "account_exec" | "creative_director" | "designer";
      work_status:
        | "planned"
        | "in_design"
        | "internal_review"
        | "client_review"
        | "changes_requested"
        | "approved"
        | "scheduled"
        | "published";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      campaign_status: ["draft", "sent", "approved", "live", "complete"],
      client_status: ["lead_won", "onboarding", "active", "paused", "ended"],
      goal_category: ["visibility", "credibility", "engagement", "results"],
      invoice_status: ["draft", "issued", "part_paid", "paid", "credited"],
      item_format: [
        "post",
        "story",
        "reel",
        "ad_feed",
        "ad_story",
        "ad_variant",
      ],
      lead_source: [
        "referral",
        "website",
        "facebook",
        "instagram",
        "linkedin",
        "walk_in",
        "event",
        "other",
      ],
      lead_stage: ["new", "contacted", "quote_sent", "won", "lost"],
      metric_source: ["manual", "meta", "ga4"],
      pillar: [
        "showcase",
        "educate",
        "proof",
        "behind_the_scenes",
        "engage",
        "campaign",
      ],
      plan_status: ["draft", "sent", "approved"],
      quote_status: ["draft", "sent", "accepted", "declined", "expired"],
      service_unit: ["monthly", "once_off", "hourly", "per_item"],
      staff_role: ["ceo", "account_exec", "creative_director", "designer"],
      work_status: [
        "planned",
        "in_design",
        "internal_review",
        "client_review",
        "changes_requested",
        "approved",
        "scheduled",
        "published",
      ],
    },
  },
} as const;
