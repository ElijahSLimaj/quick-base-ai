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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chunks: {
        Row: {
          content_id: string | null
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          text: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          text: string
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          chunked_at: string | null
          content: string
          created_at: string | null
          id: string
          website_id: string | null
          source_url: string
        }
        Insert: {
          chunked_at?: string | null
          content: string
          created_at?: string | null
          id?: string
          website_id?: string | null
          source_url: string
        }
        Update: {
          chunked_at?: string | null
          content?: string
          created_at?: string | null
          id?: string
          website_id?: string | null
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      websites: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          name: string
          organization_id: string | null
          owner_id: string | null
          plan_name: string | null
          settings: Json | null
          sites: Json | null
          stripe_customer_id: string | null
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          name: string
          organization_id?: string | null
          owner_id?: string | null
          plan_name?: string | null
          settings?: Json | null
          sites?: Json | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          plan_name?: string | null
          settings?: Json | null
          sites?: Json | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "websites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      queries: {
        Row: {
          answer: string
          confidence: number
          created_at: string | null
          id: string
          website_id: string | null
          question: string
        }
        Insert: {
          answer: string
          confidence: number
          created_at?: string | null
          id?: string
          website_id?: string | null
          question: string
        }
        Update: {
          answer?: string
          confidence?: number
          created_at?: string | null
          id?: string
          website_id?: string | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      query_feedback: {
        Row: {
          created_at: string | null
          feedback: string | null
          id: string
          query_id: string | null
          rating: number
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          query_id?: string | null
          rating: number
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          query_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "query_feedback_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          id: string
          plan: string
          website_id: string | null
          status: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan: string
          website_id?: string | null
          status: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          plan?: string
          website_id?: string | null
          status?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          additional_seats: number | null
          created_at: string | null
          description: string | null
          id: string
          max_seats: number | null
          name: string
          owner_id: string
          plan_name: string
          seat_count: number | null
          settings: Json | null
          slug: string | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          additional_seats?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_seats?: number | null
          name: string
          owner_id: string
          plan_name?: string
          seat_count?: number | null
          settings?: Json | null
          slug?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_seats?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_seats?: number | null
          name?: string
          owner_id?: string
          plan_name?: string
          seat_count?: number | null
          settings?: Json | null
          slug?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string | null
          invited_by: string
          message: string | null
          organization_id: string
          permissions: Json | null
          role: string
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_at?: string | null
          invited_by: string
          message?: string | null
          organization_id: string
          permissions?: Json | null
          role?: string
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string
          message?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: string
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          permissions: Json | null
          role: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          permissions?: Json | null
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
          ai_confidence: number | null
          ai_response: string | null
          assigned_at: string | null
          assigned_to: string | null
          category: string | null
          closed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_satisfaction_feedback: string | null
          customer_satisfaction_rating: number | null
          customer_user_id: string | null
          description: string
          escalation_reason: string | null
          first_response_at: string | null
          first_response_time_minutes: number | null
          id: string
          organization_id: string | null
          original_query: string | null
          priority: string
          resolution: string | null
          resolution_time_minutes: number | null
          resolved_at: string | null
          sla_breach: boolean | null
          status: string
          ticket_number: string
          title: string
          updated_at: string | null
          website_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_response?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_satisfaction_feedback?: string | null
          customer_satisfaction_rating?: number | null
          customer_user_id?: string | null
          description: string
          escalation_reason?: string | null
          first_response_at?: string | null
          first_response_time_minutes?: number | null
          id?: string
          organization_id?: string | null
          original_query?: string | null
          priority?: string
          resolution?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          sla_breach?: boolean | null
          status?: string
          ticket_number: string
          title: string
          updated_at?: string | null
          website_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_response?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_satisfaction_feedback?: string | null
          customer_satisfaction_rating?: number | null
          customer_user_id?: string | null
          description?: string
          escalation_reason?: string | null
          first_response_at?: string | null
          first_response_time_minutes?: number | null
          id?: string
          organization_id?: string | null
          original_query?: string | null
          priority?: string
          resolution?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          sla_breach?: boolean | null
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string | null
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_user_id_fkey"
            columns: ["customer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          author_type: string
          content_type: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          email_message_id: string | null
          id: string
          in_reply_to: string | null
          is_first_response: boolean | null
          is_internal: boolean | null
          message: string
          message_type: string
          read_at: string | null
          read_by: string | null
          ticket_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          author_type: string
          content_type?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          email_message_id?: string | null
          id?: string
          in_reply_to?: string | null
          is_first_response?: boolean | null
          is_internal?: boolean | null
          message: string
          message_type?: string
          read_at?: string | null
          read_by?: string | null
          ticket_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          author_type?: string
          content_type?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          email_message_id?: string | null
          id?: string
          in_reply_to?: string | null
          is_first_response?: boolean | null
          is_internal?: boolean | null
          message?: string
          message_type?: string
          read_at?: string | null
          read_by?: string | null
          ticket_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string | null
          customer_email: string | null
          expires_at: string | null
          file_extension: string | null
          file_path: string
          file_size: number
          filename: string
          id: string
          is_internal: boolean | null
          is_public: boolean | null
          message_id: string | null
          metadata: Json | null
          mime_type: string
          original_filename: string
          processed_at: string | null
          scan_result: string | null
          scan_status: string | null
          text_content: string | null
          thumbnail_path: string | null
          ticket_id: string
          updated_at: string | null
          upload_source: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          expires_at?: string | null
          file_extension?: string | null
          file_path: string
          file_size: number
          filename: string
          id?: string
          is_internal?: boolean | null
          is_public?: boolean | null
          message_id?: string | null
          metadata?: Json | null
          mime_type: string
          original_filename: string
          processed_at?: string | null
          scan_result?: string | null
          scan_status?: string | null
          text_content?: string | null
          thumbnail_path?: string | null
          ticket_id: string
          updated_at?: string | null
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          expires_at?: string | null
          file_extension?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          is_internal?: boolean | null
          is_public?: boolean | null
          message_id?: string | null
          metadata?: Json | null
          mime_type?: string
          original_filename?: string
          processed_at?: string | null
          scan_result?: string | null
          scan_status?: string | null
          text_content?: string | null
          thumbnail_path?: string | null
          ticket_id?: string
          updated_at?: string | null
          upload_source?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      crawl_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          pages_crawled: number | null
          project_id: string | null
          scheduled_at: string
          site_url: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          pages_crawled?: number | null
          project_id?: string | null
          scheduled_at: string
          site_url: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          pages_crawled?: number | null
          project_id?: string | null
          scheduled_at?: string
          site_url?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          }
        ]
      }
      usage_tracking: {
        Row: {
          answers_used: number | null
          created_at: string | null
          crawls_used: number | null
          id: string
          manual_recrawls_used: number | null
          period_end: string
          period_start: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          answers_used?: number | null
          created_at?: string | null
          crawls_used?: number | null
          id?: string
          manual_recrawls_used?: number | null
          period_end: string
          period_start: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          answers_used?: number | null
          created_at?: string | null
          crawls_used?: number | null
          id?: string
          manual_recrawls_used?: number | null
          period_end?: string
          period_start?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      hybrid_search: {
        Args: {
          match_count?: number
          project_id: string
          query_embedding: string
          query_text: string
        }
        Returns: {
          metadata: Json
          search_type: string
          similarity: number
          source_url: string
          text: string
        }[]
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_chunks: {
        Args: {
          match_count?: number
          project_id?: string
          query_embedding: string
        }
        Returns: {
          metadata: Json
          similarity: number
          source_url: string
          text: string
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
