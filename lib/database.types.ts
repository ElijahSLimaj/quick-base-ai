export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chunks: {
        Row: {
          content_id: string | null
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json
          text: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          text: string
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunks_content_id_fkey"
            columns: ["content_id"]
            referencedRelation: "content"
            referencedColumns: ["id"]
          }
        ]
      }
      content: {
        Row: {
          auto_crawl_enabled: boolean | null
          chunked_at: string | null
          content: string
          created_at: string | null
          crawl_frequency: unknown | null
          id: string
          last_crawled_at: string | null
          next_crawl_at: string | null
          pages_count: number | null
          site_url: string | null
          source_url: string
          website_id: string | null
        }
        Insert: {
          auto_crawl_enabled?: boolean | null
          chunked_at?: string | null
          content: string
          created_at?: string | null
          crawl_frequency?: unknown | null
          id?: string
          last_crawled_at?: string | null
          next_crawl_at?: string | null
          pages_count?: number | null
          site_url?: string | null
          source_url: string
          website_id?: string | null
        }
        Update: {
          auto_crawl_enabled?: boolean | null
          chunked_at?: string | null
          content?: string
          created_at?: string | null
          crawl_frequency?: unknown | null
          id?: string
          last_crawled_at?: string | null
          next_crawl_at?: string | null
          pages_count?: number | null
          site_url?: string | null
          source_url?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_project_id_fkey"
            columns: ["website_id"]
            referencedRelation: "websites"
            referencedColumns: ["id"]
          }
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
            referencedRelation: "users"
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
          question: string
          website_id: string | null
        }
        Insert: {
          answer: string
          confidence: number
          created_at?: string | null
          id?: string
          question: string
          website_id?: string | null
        }
        Update: {
          answer?: string
          confidence?: number
          created_at?: string | null
          id?: string
          question?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queries_project_id_fkey"
            columns: ["website_id"]
            referencedRelation: "websites"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          answers_limit: number | null
          auto_crawl_enabled: boolean | null
          created_at: string | null
          crawls_limit: number | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          manual_recrawls_limit: number | null
          plan: string
          plan_type: string
          sites_limit: number | null
          status: string
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
          usage_count: number | null
          website_id: string | null
        }
        Insert: {
          answers_limit?: number | null
          auto_crawl_enabled?: boolean | null
          created_at?: string | null
          crawls_limit?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          manual_recrawls_limit?: number | null
          plan: string
          plan_type?: string
          sites_limit?: number | null
          status: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          usage_count?: number | null
          website_id?: string | null
        }
        Update: {
          answers_limit?: number | null
          auto_crawl_enabled?: boolean | null
          created_at?: string | null
          crawls_limit?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          manual_recrawls_limit?: number | null
          plan?: string
          plan_type?: string
          sites_limit?: number | null
          status?: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          usage_count?: number | null
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_project_id_fkey"
            columns: ["website_id"]
            referencedRelation: "websites"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
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
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_user_id_fkey"
            columns: ["customer_user_id"]
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
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_read_by_fkey"
            columns: ["read_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "websites_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}