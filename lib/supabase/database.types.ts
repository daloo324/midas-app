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
      brand_briefs: {
        Row: {
          answers: NonNullable<Json>;
          client_id: string;
          created_at: string;
          design_notes: string | null;
          id: string;
          submitted_at: string | null;
          updated_at: string;
          uploads: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          answers?: NonNullable<Json>;
          client_id: string;
          created_at?: string;
          design_notes?: string | null;
          id?: string;
          submitted_at?: string | null;
          updated_at?: string;
          uploads?: NonNullable<Json>;
        };
        Update: {
          answers?: NonNullable<Json>;
          client_id?: string;
          created_at?: string;
          design_notes?: string | null;
          id?: string;
          submitted_at?: string | null;
          updated_at?: string;
          uploads?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "brand_briefs_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_briefs_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      brand_kit_files: {
        Row: {
          client_id: string;
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string | null;
          size_bytes: number;
          slot: string;
          storage_path: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          file_name: string;
          id?: string;
          mime_type?: string | null;
          size_bytes: number;
          slot: string;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          file_name?: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number;
          slot?: string;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "brand_kit_files_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_kit_files_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      brand_kits: {
        Row: {
          assigned_designer_id: string | null;
          body_font: string | null;
          client_id: string;
          colors: NonNullable<Json>;
          created_at: string;
          guide_checks: NonNullable<Json>;
          heading_font: string | null;
          id: string;
          shown_to_client_at: string | null;
          signed_off_at: string | null;
          signed_off_by: string | null;
          status: Database["public"]["Enums"]["work_status"];
          updated_at: string;
          voice: string | null;
        };
        ComputedFields: never;
        Insert: {
          assigned_designer_id?: string | null;
          body_font?: string | null;
          client_id: string;
          colors?: NonNullable<Json>;
          created_at?: string;
          guide_checks?: NonNullable<Json>;
          heading_font?: string | null;
          id?: string;
          shown_to_client_at?: string | null;
          signed_off_at?: string | null;
          signed_off_by?: string | null;
          status?: Database["public"]["Enums"]["work_status"];
          updated_at?: string;
          voice?: string | null;
        };
        Update: {
          assigned_designer_id?: string | null;
          body_font?: string | null;
          client_id?: string;
          colors?: NonNullable<Json>;
          created_at?: string;
          guide_checks?: NonNullable<Json>;
          heading_font?: string | null;
          id?: string;
          shown_to_client_at?: string | null;
          signed_off_at?: string | null;
          signed_off_by?: string | null;
          status?: Database["public"]["Enums"]["work_status"];
          updated_at?: string;
          voice?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "brand_kits_assigned_designer_id_fkey";
            columns: ["assigned_designer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_kits_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_kits_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: true;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          ad_budget: number | null;
          ads_run_by: string | null;
          audience: NonNullable<Json>;
          client_approved_at: string | null;
          client_id: string;
          created_at: string;
          creative_direction: string | null;
          end_date: string | null;
          goal: string | null;
          id: string;
          launch: NonNullable<Json>;
          main_kpi: string | null;
          message: NonNullable<Json>;
          month_id: string;
          name: string | null;
          offer: string | null;
          results: string | null;
          results_metrics: NonNullable<Json>;
          start_date: string | null;
          status: Database["public"]["Enums"]["campaign_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          ad_budget?: number | null;
          ads_run_by?: string | null;
          audience?: NonNullable<Json>;
          client_approved_at?: string | null;
          client_id: string;
          created_at?: string;
          creative_direction?: string | null;
          end_date?: string | null;
          goal?: string | null;
          id?: string;
          launch?: NonNullable<Json>;
          main_kpi?: string | null;
          message?: NonNullable<Json>;
          month_id: string;
          name?: string | null;
          offer?: string | null;
          results?: string | null;
          results_metrics?: NonNullable<Json>;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          updated_at?: string;
        };
        Update: {
          ad_budget?: number | null;
          ads_run_by?: string | null;
          audience?: NonNullable<Json>;
          client_approved_at?: string | null;
          client_id?: string;
          created_at?: string;
          creative_direction?: string | null;
          end_date?: string | null;
          goal?: string | null;
          id?: string;
          launch?: NonNullable<Json>;
          main_kpi?: string | null;
          message?: NonNullable<Json>;
          month_id?: string;
          name?: string | null;
          offer?: string | null;
          results?: string | null;
          results_metrics?: NonNullable<Json>;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: true;
            referencedRelation: "content_months";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: true;
            referencedRelation: "portal_months";
            referencedColumns: ["id"];
          },
        ];
      };
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
      content_items: {
        Row: {
          assigned_designer_id: string | null;
          caption: string | null;
          client_id: string;
          created_at: string;
          final_file_path: string | null;
          format: Database["public"]["Enums"]["item_format"];
          graphic_copy: string | null;
          hashtags: string | null;
          id: string;
          month_id: string;
          notes: string | null;
          pillar: Database["public"]["Enums"]["pillar"];
          platform: string;
          preview_path: string | null;
          revision_rounds: number;
          scheduled_date: string | null;
          shown_to_client_at: string | null;
          slot_code: string;
          status: Database["public"]["Enums"]["work_status"];
          suggested_fields: string[];
          topic: string | null;
          updated_at: string;
          visual: string | null;
        };
        ComputedFields: never;
        Insert: {
          assigned_designer_id?: string | null;
          caption?: string | null;
          client_id: string;
          created_at?: string;
          final_file_path?: string | null;
          format: Database["public"]["Enums"]["item_format"];
          graphic_copy?: string | null;
          hashtags?: string | null;
          id?: string;
          month_id: string;
          notes?: string | null;
          pillar: Database["public"]["Enums"]["pillar"];
          platform?: string;
          preview_path?: string | null;
          revision_rounds?: number;
          scheduled_date?: string | null;
          shown_to_client_at?: string | null;
          slot_code: string;
          status?: Database["public"]["Enums"]["work_status"];
          suggested_fields?: string[];
          topic?: string | null;
          updated_at?: string;
          visual?: string | null;
        };
        Update: {
          assigned_designer_id?: string | null;
          caption?: string | null;
          client_id?: string;
          created_at?: string;
          final_file_path?: string | null;
          format?: Database["public"]["Enums"]["item_format"];
          graphic_copy?: string | null;
          hashtags?: string | null;
          id?: string;
          month_id?: string;
          notes?: string | null;
          pillar?: Database["public"]["Enums"]["pillar"];
          platform?: string;
          preview_path?: string | null;
          revision_rounds?: number;
          scheduled_date?: string | null;
          shown_to_client_at?: string | null;
          slot_code?: string;
          status?: Database["public"]["Enums"]["work_status"];
          suggested_fields?: string[];
          topic?: string | null;
          updated_at?: string;
          visual?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_items_assigned_designer_id_fkey";
            columns: ["assigned_designer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: false;
            referencedRelation: "content_months";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: false;
            referencedRelation: "portal_months";
            referencedColumns: ["id"];
          },
        ];
      };
      content_months: {
        Row: {
          checklist: NonNullable<Json>;
          client_id: string;
          created_at: string;
          id: string;
          month: string;
          plan_approved_at: string | null;
          plan_approved_by: string | null;
          plan_sent_at: string | null;
          plan_status: Database["public"]["Enums"]["plan_status"];
          review: NonNullable<Json>;
          review_published_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          checklist?: NonNullable<Json>;
          client_id: string;
          created_at?: string;
          id?: string;
          month: string;
          plan_approved_at?: string | null;
          plan_approved_by?: string | null;
          plan_sent_at?: string | null;
          plan_status?: Database["public"]["Enums"]["plan_status"];
          review?: NonNullable<Json>;
          review_published_at?: string | null;
          updated_at?: string;
        };
        Update: {
          checklist?: NonNullable<Json>;
          client_id?: string;
          created_at?: string;
          id?: string;
          month?: string;
          plan_approved_at?: string | null;
          plan_approved_by?: string | null;
          plan_sent_at?: string | null;
          plan_status?: Database["public"]["Enums"]["plan_status"];
          review?: NonNullable<Json>;
          review_published_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_months_client_id_fkey";
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
      inspiration: {
        Row: {
          client_id: string | null;
          created_at: string;
          id: string;
          note: string | null;
          storage_path: string;
          tags: string[];
          uploaded_by: string;
        };
        ComputedFields: never;
        Insert: {
          client_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          storage_path: string;
          tags?: string[];
          uploaded_by?: string;
        };
        Update: {
          client_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          storage_path?: string;
          tags?: string[];
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspiration_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspiration_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspiration_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      kpi_months: {
        Row: {
          client_id: string | null;
          created_at: string;
          id: string;
          locked: boolean;
          metrics: NonNullable<Json>;
          month: string;
          sources: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_id?: string | null;
          created_at?: string;
          id?: string;
          locked?: boolean;
          metrics?: NonNullable<Json>;
          month: string;
          sources?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          client_id?: string | null;
          created_at?: string;
          id?: string;
          locked?: boolean;
          metrics?: NonNullable<Json>;
          month?: string;
          sources?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kpi_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kpi_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      library_fonts: {
        Row: {
          created_at: string;
          family: string;
          file_name: string;
          id: string;
          italic: boolean;
          licence_note: string | null;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string;
          weight: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          family: string;
          file_name: string;
          id?: string;
          italic?: boolean;
          licence_note?: string | null;
          size_bytes: number;
          storage_path: string;
          uploaded_by?: string;
          weight: number;
        };
        Update: {
          created_at?: string;
          family?: string;
          file_name?: string;
          id?: string;
          italic?: boolean;
          licence_note?: string | null;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "library_fonts_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      library_pairings: {
        Row: {
          body_family: string;
          created_at: string;
          created_by: string;
          good_for: string | null;
          heading_family: string;
          id: string;
          style: string;
        };
        ComputedFields: never;
        Insert: {
          body_family: string;
          created_at?: string;
          created_by?: string;
          good_for?: string | null;
          heading_family: string;
          id?: string;
          style: string;
        };
        Update: {
          body_family?: string;
          created_at?: string;
          created_by?: string;
          good_for?: string | null;
          heading_family?: string;
          id?: string;
          style?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_pairings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
          phone: string | null;
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
          phone?: string | null;
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
          phone?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      questionnaire_invites: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          opened_at: string | null;
          token: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          opened_at?: string | null;
          token: string;
          used_at?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          opened_at?: string | null;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questionnaire_invites_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questionnaire_invites_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
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
      suggestion_calls: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          items: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          items: number;
          user_id: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          items?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suggestion_calls_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suggestion_calls_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suggestion_calls_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      time_entries: {
        Row: {
          client_id: string;
          content_item_id: string | null;
          created_at: string;
          ended_at: string | null;
          id: string;
          is_brand_kit: boolean;
          last_activity_at: string | null;
          manual: boolean;
          minutes: number | null;
          note: string | null;
          started_at: string;
          user_id: string;
          entry_minutes: number | null;
        };
        ComputedFields: "entry_minutes";
        Insert: {
          client_id: string;
          content_item_id?: string | null;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          is_brand_kit?: boolean;
          last_activity_at?: string | null;
          manual?: boolean;
          minutes?: number | null;
          note?: string | null;
          started_at?: string;
          user_id: string;
        };
        Update: {
          client_id?: string;
          content_item_id?: string | null;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          is_brand_kit?: boolean;
          last_activity_at?: string | null;
          manual?: boolean;
          minutes?: number | null;
          note?: string | null;
          started_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_content_item_id_fkey";
            columns: ["content_item_id"];
            isOneToOne: false;
            referencedRelation: "content_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_content_item_id_fkey";
            columns: ["content_item_id"];
            isOneToOne: false;
            referencedRelation: "portal_calendar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_content_item_id_fkey";
            columns: ["content_item_id"];
            isOneToOne: false;
            referencedRelation: "portal_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      kpi_months_calc: {
        Row: {
          client_id: string | null;
          cost_per_result: number | null;
          engagement_rate: number | null;
          first_round_rate: number | null;
          id: string | null;
          month: string | null;
          net_new_followers: number | null;
          planned: number | null;
          published: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "kpi_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kpi_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_calendar: {
        Row: {
          client_id: string | null;
          format: Database["public"]["Enums"]["item_format"] | null;
          id: string | null;
          month: string | null;
          month_id: string | null;
          pillar: Database["public"]["Enums"]["pillar"] | null;
          platform: string | null;
          scheduled_date: string | null;
          slot_code: string | null;
          topic: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: false;
            referencedRelation: "content_months";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: false;
            referencedRelation: "portal_months";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_campaigns: {
        Row: {
          ad_budget: number | null;
          ads_run_by: string | null;
          audience: Json | null;
          client_approved_at: string | null;
          client_id: string | null;
          creative_direction: string | null;
          end_date: string | null;
          goal: string | null;
          id: string | null;
          launch: Json | null;
          main_kpi: string | null;
          message: Json | null;
          month: string | null;
          month_id: string | null;
          name: string | null;
          offer: string | null;
          results: string | null;
          results_metrics: Json | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["campaign_status"] | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: true;
            referencedRelation: "content_months";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: true;
            referencedRelation: "portal_months";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_client: {
        Row: {
          account_exec_email: string | null;
          account_exec_name: string | null;
          account_exec_phone: string | null;
          baseline: Json | null;
          client_code: string | null;
          id: string | null;
          main_goal: Database["public"]["Enums"]["goal_category"] | null;
          monthly_fee: number | null;
          name: string | null;
          platforms: string[] | null;
          service_inclusions: Json | null;
          service_name: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["client_status"] | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      portal_item_history: {
        Row: {
          actor_kind: string | null;
          client_id: string | null;
          created_at: string | null;
          id: string | null;
          item_id: string | null;
          to_status: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_items: {
        Row: {
          caption: string | null;
          client_id: string | null;
          format: Database["public"]["Enums"]["item_format"] | null;
          graphic_copy: string | null;
          hashtags: string | null;
          id: string | null;
          month: string | null;
          month_id: string | null;
          pillar: Database["public"]["Enums"]["pillar"] | null;
          platform: string | null;
          preview_path: string | null;
          revision_rounds: number | null;
          scheduled_date: string | null;
          shown_to_client_at: string | null;
          slot_code: string | null;
          status: Database["public"]["Enums"]["work_status"] | null;
          topic: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: false;
            referencedRelation: "content_months";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_items_month_id_fkey";
            columns: ["month_id"];
            isOneToOne: false;
            referencedRelation: "portal_months";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_kpis: {
        Row: {
          client_id: string | null;
          metrics: Json | null;
          month: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "kpi_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kpi_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_months: {
        Row: {
          client_id: string | null;
          id: string | null;
          month: string | null;
          plan_approved_at: string | null;
          plan_sent_at: string | null;
          plan_status: Database["public"]["Enums"]["plan_status"] | null;
          review: Json | null;
          review_published_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_id?: string | null;
          id?: string | null;
          month?: string | null;
          plan_approved_at?: string | null;
          plan_sent_at?: string | null;
          plan_status?: Database["public"]["Enums"]["plan_status"] | null;
          review?: never;
          review_published_at?: string | null;
        };
        Update: {
          client_id?: string | null;
          id?: string | null;
          month?: string | null;
          plan_approved_at?: string | null;
          plan_sent_at?: string | null;
          plan_status?: Database["public"]["Enums"]["plan_status"] | null;
          review?: never;
          review_published_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_months_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "portal_client";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      activate_client: { Args: { p_client_id: string }; Returns: undefined };
      actor_kind: { Args: Record<PropertyKey, never>; Returns: string };
      add_client_feedback: {
        Args: {
          p_body: string;
          p_client_id: string;
          p_entity_id: string;
          p_entity_type: string;
        };
        Returns: undefined;
      };
      add_manual_time: {
        Args: {
          p_item_id?: string;
          p_kit_client_id?: string;
          p_minutes: number;
          p_note: string;
        };
        Returns: undefined;
      };
      apply_suggestions: {
        Args: {
          p_caption: string;
          p_graphic_copy: string;
          p_hashtags: string;
          p_item_id: string;
          p_visual: string;
        };
        Returns: string[];
      };
      auth_role: { Args: Record<PropertyKey, never>; Returns: string };
      brand_kit_progress: { Args: { p_client_id: string }; Returns: number };
      can_access_client: { Args: { p_client_id: string }; Returns: boolean };
      claim_suggestion_call: {
        Args: { p_client_id: string; p_items: number };
        Returns: number;
      };
      client_code_letters: { Args: { p_name: string }; Returns: string };
      client_login_locked: { Args: { p_login_id: string }; Returns: boolean };
      client_sees_kit_slot: {
        Args: { p_client_id: string; p_slot: string };
        Returns: boolean;
      };
      client_time: {
        Args: { p_client_id: string; p_month: string };
        Returns: {
          content_item_id: string;
          is_brand_kit: boolean;
          manual_minutes: number;
          minutes: number;
          user_id: string;
        }[];
      };
      content_object_item: {
        Args: { p_name: string };
        Returns: {
          assigned_designer_id: string | null;
          caption: string | null;
          client_id: string;
          created_at: string;
          final_file_path: string | null;
          format: Database["public"]["Enums"]["item_format"];
          graphic_copy: string | null;
          hashtags: string | null;
          id: string;
          month_id: string;
          notes: string | null;
          pillar: Database["public"]["Enums"]["pillar"];
          platform: string;
          preview_path: string | null;
          revision_rounds: number;
          scheduled_date: string | null;
          shown_to_client_at: string | null;
          slot_code: string;
          status: Database["public"]["Enums"]["work_status"];
          suggested_fields: string[];
          topic: string | null;
          updated_at: string;
          visual: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "content_items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      content_object_readable: { Args: { p_name: string }; Returns: boolean };
      content_object_writable: { Args: { p_name: string }; Returns: boolean };
      create_campaign: { Args: { p_month_id: string }; Returns: string };
      create_questionnaire_invite: {
        Args: { p_client_id: string };
        Returns: string;
      };
      entry_minutes: {
        Args: {
          t: Omit<
            Database["public"]["Tables"]["time_entries"]["Row"],
            Database["public"]["Tables"]["time_entries"]["ComputedFields"]
          >;
        };
        Returns: number;
      };
      is_ceo: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_trusted_caller: { Args: Record<PropertyKey, never>; Returns: boolean };
      kit_object_readable: { Args: { p_name: string }; Returns: boolean };
      kit_object_writable: { Args: { p_name: string }; Returns: boolean };
      kit_slot_accepts: {
        Args: { p_file_name: string; p_slot: string };
        Returns: boolean;
      };
      kpi_keys: { Args: Record<PropertyKey, never>; Returns: string[] };
      log_status: {
        Args: {
          p_client_id: string;
          p_comment: string;
          p_entity_id: string;
          p_entity_type: string;
          p_from: string;
          p_to: string;
        };
        Returns: undefined;
      };
      manages_font_library: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      month_label: { Args: { p_month: string }; Returns: string };
      notify: {
        Args: {
          p_body: string;
          p_link: string;
          p_title: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      notify_stale_client_reviews: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      open_questionnaire: {
        Args: { p_token: string };
        Returns: {
          business_name: string;
          client_id: string;
          state: string;
        }[];
      };
      pillar_mix_total: { Args: { mix: Json }; Returns: number };
      post_pillar_order: {
        Args: { p_mix: Json };
        Returns: Database["public"]["Enums"]["pillar"][];
      };
      publish_review: { Args: { p_month_id: string }; Returns: undefined };
      questionnaire_upload_allowed: {
        Args: { p_object_name: string };
        Returns: boolean;
      };
      respond_to_calendar: {
        Args: { p_approve: boolean; p_comment?: string; p_month_id: string };
        Returns: undefined;
      };
      save_design_notes: {
        Args: { p_client_id: string; p_notes: string };
        Returns: undefined;
      };
      send_calendar: { Args: { p_month_id: string }; Returns: undefined };
      set_brand_kit_status: {
        Args: {
          p_client_id: string;
          p_comment?: string;
          p_new_status: Database["public"]["Enums"]["work_status"];
          p_signed_off_by?: string;
        };
        Returns: undefined;
      };
      set_campaign_status: {
        Args: {
          p_campaign_id: string;
          p_comment?: string;
          p_launch_checks_done?: boolean;
          p_new_status: Database["public"]["Enums"]["campaign_status"];
        };
        Returns: undefined;
      };
      set_content_status: {
        Args: {
          p_comment?: string;
          p_item_id: string;
          p_new_status: Database["public"]["Enums"]["work_status"];
        };
        Returns: undefined;
      };
      start_month: {
        Args: { p_client_id: string; p_month: string };
        Returns: string;
      };
      start_timer: {
        Args: { p_item_id?: string; p_kit_client_id?: string };
        Returns: string;
      };
      stop_running_timer: {
        Args: { p_at: string; p_user: string };
        Returns: undefined;
      };
      stop_timer: { Args: { p_at?: string }; Returns: undefined };
      storage_client_id: { Args: { p_object_name: string }; Returns: string };
      submit_questionnaire: {
        Args: { p_answers: Json; p_token: string; p_uploads: Json };
        Returns: undefined;
      };
      team_time: {
        Args: { p_month: string };
        Returns: {
          client_id: string;
          minutes: number;
          user_id: string;
        }[];
      };
      today_gaborone: { Args: Record<PropertyKey, never>; Returns: string };
      undo_client_response: {
        Args: { p_entity_id: string; p_entity_type: string };
        Returns: undefined;
      };
      unpublish_review: { Args: { p_month_id: string }; Returns: undefined };
      valid_kit_colors: { Args: { c: Json }; Returns: boolean };
      valid_kit_slot: { Args: { p_slot: string }; Returns: boolean };
      valid_kpi_metrics: { Args: { m: Json }; Returns: boolean };
      valid_kpi_sources: { Args: { s: Json }; Returns: boolean };
      working_days_between: {
        Args: { p_from: string; p_to: string };
        Returns: number;
      };
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
