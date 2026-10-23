// Provisional: written by hand to match supabase/migrations. Regenerate with
// `npm run db:types` once the local database is running.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type StaffRole = "ceo" | "account_exec" | "creative_director" | "designer";
type ClientStatus = "lead_won" | "onboarding" | "active" | "paused" | "ended";
type GoalCategory = "visibility" | "credibility" | "engagement" | "results";
type ServiceUnit = "monthly" | "once_off" | "hourly" | "per_item";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13.0.5" };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: StaffRole;
          active: boolean;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role: StaffRole;
          active?: boolean;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          unit: ServiceUnit;
          price: number;
          active: boolean;
          sort: number;
          is_retainer: boolean;
          inclusions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          unit: ServiceUnit;
          price: number;
          active?: boolean;
          sort?: number;
          is_retainer?: boolean;
          inclusions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
        Relationships: [];
      };
      settings: {
        Row: {
          id: number;
          company_name: string;
          legal_name: string | null;
          address: string | null;
          email: string | null;
          phone: string | null;
          logo_path: string | null;
          bank_details: Json;
          payment_terms_days: number;
          vat_registered: boolean;
          vat_number: string | null;
          vat_rate: number;
          max_active_clients: number;
          profit_threshold_per_hour: number;
          reminders_enabled: boolean;
          invoice_footer: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          client_code: string;
          industry: string | null;
          status: ClientStatus;
          account_exec_id: string | null;
          service_id: string | null;
          monthly_fee: number | null;
          start_date: string | null;
          end_date: string | null;
          contact_name: string | null;
          contact_role: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          decision_maker: string | null;
          platforms: string[];
          pillar_mix: Json;
          main_goal: GoalCategory | null;
          expectation_notes: string | null;
          baseline: Json;
          notes: string | null;
          reminders_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          client_code?: string;
          industry?: string | null;
          status?: ClientStatus;
          account_exec_id?: string | null;
          service_id?: string | null;
          monthly_fee?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          contact_name?: string | null;
          contact_role?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          decision_maker?: string | null;
          platforms?: string[];
          pillar_mix?: Json;
          main_goal?: GoalCategory | null;
          expectation_notes?: string | null;
          baseline?: Json;
          notes?: string | null;
          reminders_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
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
      client_users: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          full_name: string;
          email: string;
          login_id: string;
          is_primary: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          full_name: string;
          email: string;
          login_id?: string;
          is_primary?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      login_attempts: {
        Row: {
          id: string;
          login_id: string;
          succeeded: boolean;
          ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          login_id: string;
          succeeded: boolean;
          ip?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["login_attempts"]["Insert"]
        >;
        Relationships: [];
      };
      status_events: {
        Row: {
          id: string;
          client_id: string;
          entity_type: string;
          entity_id: string;
          from_status: string | null;
          to_status: string;
          comment: string | null;
          actor_id: string | null;
          actor_kind: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          entity_type: string;
          entity_id: string;
          from_status?: string | null;
          to_status: string;
          comment?: string | null;
          actor_id?: string | null;
          actor_kind: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["status_events"]["Insert"]
        >;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          client_id: string;
          entity_type: string;
          entity_id: string;
          body: string;
          author_id: string;
          author_kind: string;
          visible_to_client: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          entity_type: string;
          entity_id: string;
          body: string;
          author_id: string;
          author_kind: string;
          visible_to_client?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notifications"]["Insert"]
        >;
        Relationships: [];
      };
      document_counters: {
        Row: {
          doc_type: string;
          year: number;
          last_number: number;
          updated_at: string;
        };
        Insert: {
          doc_type: string;
          year: number;
          last_number?: number;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["document_counters"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      portal_client: {
        Row: {
          id: string | null;
          name: string | null;
          client_code: string | null;
          status: ClientStatus | null;
          start_date: string | null;
          platforms: string[] | null;
          monthly_fee: number | null;
          account_exec_name: string | null;
          account_exec_email: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      auth_role: { Args: never; Returns: string };
      is_staff: { Args: never; Returns: boolean };
      is_ceo: { Args: never; Returns: boolean };
      can_access_client: { Args: { p_client_id: string }; Returns: boolean };
      client_login_locked: { Args: { p_login_id: string }; Returns: boolean };
      client_code_letters: { Args: { p_name: string }; Returns: string };
    };
    Enums: {
      staff_role: StaffRole;
      client_status: ClientStatus;
      goal_category: GoalCategory;
      pillar:
        | "showcase"
        | "educate"
        | "proof"
        | "behind_the_scenes"
        | "engage"
        | "campaign";
      item_format:
        "post" | "story" | "reel" | "ad_feed" | "ad_story" | "ad_variant";
      work_status:
        | "planned"
        | "in_design"
        | "internal_review"
        | "client_review"
        | "changes_requested"
        | "approved"
        | "scheduled"
        | "published";
      plan_status: "draft" | "sent" | "approved";
      campaign_status: "draft" | "sent" | "approved" | "live" | "complete";
      service_unit: ServiceUnit;
      lead_stage: "new" | "contacted" | "quote_sent" | "won" | "lost";
      lead_source:
        | "referral"
        | "website"
        | "facebook"
        | "instagram"
        | "linkedin"
        | "walk_in"
        | "event"
        | "other";
      quote_status: "draft" | "sent" | "accepted" | "declined" | "expired";
      invoice_status: "draft" | "issued" | "part_paid" | "paid" | "credited";
      metric_source: "manual" | "meta" | "ga4";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
