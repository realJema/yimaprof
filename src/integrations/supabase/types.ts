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
      academic_years: {
        Row: {
          created_at: string | null
          end_year: number
          id: string
          is_active: boolean | null
          start_year: number
          year_label: string
        }
        Insert: {
          created_at?: string | null
          end_year: number
          id?: string
          is_active?: boolean | null
          start_year: number
          year_label: string
        }
        Update: {
          created_at?: string | null
          end_year?: number
          id?: string
          is_active?: boolean | null
          start_year?: number
          year_label?: string
        }
        Relationships: []
      }
      affiliate_applications: {
        Row: {
          applied_at: string | null
          created_at: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_earnings: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          paid_at: string | null
          referred_user_id: string
          status: string | null
          subscription_id: string
          transaction_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          referred_user_id: string
          status?: string | null
          subscription_id: string
          transaction_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          referred_user_id?: string
          status?: string | null
          subscription_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_earnings_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          status: string | null
          tokens_estimate: number | null
          user_ip: string | null
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          status?: string | null
          tokens_estimate?: number | null
          user_ip?: string | null
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          status?: string | null
          tokens_estimate?: number | null
          user_ip?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      challenge_attempts: {
        Row: {
          answers: Json
          challenge_id: string
          class_id: string | null
          created_at: string
          establishment_id: string | null
          graded_out_of: number
          id: string
          score: number | null
          score_scaled: number | null
          started_at: string | null
          status: string
          submitted_at: string | null
          time_spent_seconds: number
          total_possible: number | null
          updated_at: string
          user_id: string
          viewed_before: boolean
        }
        Insert: {
          answers?: Json
          challenge_id: string
          class_id?: string | null
          created_at?: string
          establishment_id?: string | null
          graded_out_of?: number
          id?: string
          score?: number | null
          score_scaled?: number | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          time_spent_seconds?: number
          total_possible?: number | null
          updated_at?: string
          user_id: string
          viewed_before?: boolean
        }
        Update: {
          answers?: Json
          challenge_id?: string
          class_id?: string | null
          created_at?: string
          establishment_id?: string | null
          graded_out_of?: number
          id?: string
          score?: number | null
          score_scaled?: number | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          time_spent_seconds?: number
          total_possible?: number | null
          updated_at?: string
          user_id?: string
          viewed_before?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "challenge_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_attempts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_attempts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_attempts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          average_percent: number
          challenge_id: string
          class_id: string | null
          created_at: string
          evaluations_count: number
          id: string
          points: number
          student_id: string | null
          updated_at: string
        }
        Insert: {
          average_percent?: number
          challenge_id: string
          class_id?: string | null
          created_at?: string
          evaluations_count?: number
          id?: string
          points?: number
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          average_percent?: number
          challenge_id?: string
          class_id?: string | null
          created_at?: string
          evaluations_count?: number
          id?: string
          points?: number
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "establishment_students"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          class_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          eligible_class_ids: string[]
          eligible_series_ids: string[]
          ends_at: string
          establishment_id: string | null
          exam_id: string | null
          graded_out_of: number
          id: string
          max_attempts: number
          region: string | null
          reward: string | null
          scope: string
          starts_at: string
          status: string
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          eligible_class_ids?: string[]
          eligible_series_ids?: string[]
          ends_at?: string
          establishment_id?: string | null
          exam_id?: string | null
          graded_out_of?: number
          id?: string
          max_attempts?: number
          region?: string | null
          reward?: string | null
          scope?: string
          starts_at?: string
          status?: string
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          eligible_class_ids?: string[]
          eligible_series_ids?: string[]
          ends_at?: string
          establishment_id?: string | null
          exam_id?: string | null
          graded_out_of?: number
          id?: string
          max_attempts?: number
          region?: string | null
          reward?: string | null
          scope?: string
          starts_at?: string
          status?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          level: string
          name: string
          section: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          level: string
          name: string
          section: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          level?: string
          name?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      download_cache: {
        Row: {
          downloaded_at: string
          exam_id: string | null
          file_size: number | null
          id: string
          local_path: string | null
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          exam_id?: string | null
          file_size?: number | null
          id?: string
          local_path?: string | null
          user_id: string
        }
        Update: {
          downloaded_at?: string
          exam_id?: string | null
          file_size?: number | null
          id?: string
          local_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_cache_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      durations: {
        Row: {
          created_at: string | null
          display_label: string
          id: string
          is_active: boolean | null
          minutes: number
        }
        Insert: {
          created_at?: string | null
          display_label: string
          id?: string
          is_active?: boolean | null
          minutes: number
        }
        Update: {
          created_at?: string | null
          display_label?: string
          id?: string
          is_active?: boolean | null
          minutes?: number
        }
        Relationships: []
      }
      establishment_classes: {
        Row: {
          class_id: string
          created_at: string
          establishment_id: string
          id: string
          label: string | null
          teacher_name: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          establishment_id: string
          id?: string
          label?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          establishment_id?: string
          id?: string
          label?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_classes_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_classes_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_commissions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          establishment_id: string
          id: string
          paid_at: string | null
          plan_name: string | null
          referred_name: string | null
          status: string
          student_id: string | null
          subscription_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          establishment_id: string
          id?: string
          paid_at?: string | null
          plan_name?: string | null
          referred_name?: string | null
          status?: string
          student_id?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          establishment_id?: string
          id?: string
          paid_at?: string | null
          plan_name?: string | null
          referred_name?: string | null
          status?: string
          student_id?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_commissions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_commissions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_commissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "establishment_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          establishment_id: string
          id: string
          method: string
          note: string | null
          phone: string
          processed_at: string | null
          requested_at: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          establishment_id: string
          id?: string
          method?: string
          note?: string | null
          phone: string
          processed_at?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          establishment_id?: string
          id?: string
          method?: string
          note?: string | null
          phone?: string
          processed_at?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_payouts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_payouts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_students: {
        Row: {
          class_id: string | null
          created_at: string
          email: string | null
          establishment_id: string
          full_name: string
          id: string
          joined_at: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          email?: string | null
          establishment_id: string
          full_name: string
          id?: string
          joined_at?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          email?: string | null
          establishment_id?: string
          full_name?: string
          id?: string
          joined_at?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_students_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_students_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          is_demo: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          referral_code: string | null
          rejection_reason: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          referral_code?: string | null
          rejection_reason?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          referral_code?: string | null
          rejection_reason?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exam_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          exam_id: string
          id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          exam_id: string
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          exam_id?: string
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_reviews_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          name_fr: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          name_fr?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          name_fr?: string | null
        }
        Relationships: []
      }
      exams: {
        Row: {
          academic_year_id: string
          class_id: string | null
          content: Json | null
          created_at: string
          created_by: string
          description: string | null
          download_count: number | null
          duration_id: string
          establishment_id: string | null
          exam_type_id: string
          file_url: string | null
          id: string
          is_published: boolean | null
          language: string | null
          period_id: string
          series_id: string | null
          subject_id: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          visibility: string | null
        }
        Insert: {
          academic_year_id: string
          class_id?: string | null
          content?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          download_count?: number | null
          duration_id: string
          establishment_id?: string | null
          exam_type_id: string
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          language?: string | null
          period_id: string
          series_id?: string | null
          subject_id: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          academic_year_id?: string
          class_id?: string | null
          content?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          download_count?: number | null
          duration_id?: string
          establishment_id?: string | null
          exam_type_id?: string
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          language?: string | null
          period_id?: string
          series_id?: string | null
          subject_id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_duration_id_fkey"
            columns: ["duration_id"]
            isOneToOne: false
            referencedRelation: "durations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          feedback_text: string
          id: string
          status: Database["public"]["Enums"]["feedback_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text: string
          id?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string
          id?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          reply_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          reply_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          reply_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          depth: number | null
          id: string
          is_deleted: boolean | null
          parent_reply_id: string | null
          topic_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          depth?: number | null
          id?: string
          is_deleted?: boolean | null
          parent_reply_id?: string | null
          topic_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          depth?: number | null
          id?: string
          is_deleted?: boolean | null
          parent_reply_id?: string | null
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_closed: boolean | null
          is_hidden: boolean | null
          reply_count: number | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_closed?: boolean | null
          is_hidden?: boolean | null
          reply_count?: number | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_closed?: boolean | null
          is_hidden?: boolean | null
          reply_count?: number | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_exercises: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          lesson_id: string
          level: string
          order_number: number
          title: string | null
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          lesson_id: string
          level?: string
          order_number?: number
          title?: string | null
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          lesson_id?: string
          level?: string
          order_number?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_exercises_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          created_at: string
          id: string
          last_viewed_at: string
          lesson_id: string
          progress_percent: number
          status: string
          time_spent_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          lesson_id: string
          progress_percent?: number
          status?: string
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          lesson_id?: string
          progress_percent?: number
          status?: string
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter: string | null
          class_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          establishment_id: string | null
          estimated_minutes: number | null
          file_url: string | null
          id: string
          is_free: boolean
          is_published: boolean
          language: string
          order_number: number
          series_id: string | null
          subject_id: string | null
          summary: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          chapter?: string | null
          class_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id?: string | null
          estimated_minutes?: number | null
          file_url?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          language?: string
          order_number?: number
          series_id?: string | null
          subject_id?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          chapter?: string | null
          class_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          establishment_id?: string | null
          estimated_minutes?: number | null
          file_url?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          language?: string
          order_number?: number
          series_id?: string | null
          subject_id?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_admin_messages: boolean | null
          email_enabled: boolean | null
          email_payment_confirmed: boolean | null
          email_subscription_expiry: boolean | null
          id: string
          inapp_account_activity: boolean | null
          inapp_admin_messages: boolean | null
          inapp_payment_confirmed: boolean | null
          inapp_subscription_expiry: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_admin_messages?: boolean | null
          email_enabled?: boolean | null
          email_payment_confirmed?: boolean | null
          email_subscription_expiry?: boolean | null
          id?: string
          inapp_account_activity?: boolean | null
          inapp_admin_messages?: boolean | null
          inapp_payment_confirmed?: boolean | null
          inapp_subscription_expiry?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_admin_messages?: boolean | null
          email_enabled?: boolean | null
          email_payment_confirmed?: boolean | null
          email_subscription_expiry?: boolean | null
          id?: string
          inapp_account_activity?: boolean | null
          inapp_admin_messages?: boolean | null
          inapp_payment_confirmed?: boolean | null
          inapp_subscription_expiry?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_broadcast: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_broadcast?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_broadcast?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_children: {
        Row: {
          child_class_id: string | null
          child_name: string
          child_user_id: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          parent_id: string
          status: string
          updated_at: string
        }
        Insert: {
          child_class_id?: string | null
          child_name: string
          child_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          parent_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          child_class_id?: string | null
          child_name?: string
          child_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          parent_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_children_child_class_id_fkey"
            columns: ["child_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_children_child_user_id_fkey"
            columns: ["child_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          name_fr: string | null
          order_number: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          name_fr?: string | null
          order_number?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          name_fr?: string | null
          order_number?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          class_level: string | null
          created_at: string
          email: string | null
          establishment_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          must_change_password: boolean
          phone: string | null
          preferred_language: string | null
          profile_photo_url: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          age?: number | null
          class_level?: string | null
          created_at?: string
          email?: string | null
          establishment_id?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          must_change_password?: boolean
          phone?: string | null
          preferred_language?: string | null
          profile_photo_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          age?: number | null
          class_level?: string | null
          created_at?: string
          email?: string | null
          establishment_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          must_change_password?: boolean
          phone?: string | null
          preferred_language?: string | null
          profile_photo_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      security_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          context: Json
          created_at: string
          expires_at: string
          id: string
          max_attempts: number
          purpose: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          context?: Json
          created_at?: string
          expires_at: string
          id?: string
          max_attempts?: number
          purpose: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          context?: Json
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          name_fr: string | null
          order_number: number | null
          system: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          name_fr?: string | null
          order_number?: number | null
          system: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          name_fr?: string | null
          order_number?: number | null
          system?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          name_fr: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          name_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          name_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plan_classes: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subscription_plan_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subscription_plan_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subscription_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_classes_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean | null
          max_downloads: number | null
          name: string
          price: number
          price_annual: number | null
          price_trimester: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_days: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_downloads?: number | null
          name: string
          price: number
          price_annual?: number | null
          price_trimester?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_downloads?: number | null
          name?: string
          price?: number
          price_annual?: number | null
          price_trimester?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          referred_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          referred_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          referred_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_reference: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_evaluations: {
        Row: {
          answers: Json | null
          attempt_number: number
          completed_at: string | null
          created_at: string | null
          exam_id: string
          graded_out_of: number
          id: string
          lesson_id: string | null
          mcq_score: number | null
          mcq_total: number | null
          score_scaled: number | null
          time_spent_seconds: number | null
          total_possible: number | null
          total_score: number | null
          user_id: string
          viewed_before: boolean
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number
          completed_at?: string | null
          created_at?: string | null
          exam_id: string
          graded_out_of?: number
          id?: string
          lesson_id?: string | null
          mcq_score?: number | null
          mcq_total?: number | null
          score_scaled?: number | null
          time_spent_seconds?: number | null
          total_possible?: number | null
          total_score?: number | null
          user_id: string
          viewed_before?: boolean
        }
        Update: {
          answers?: Json | null
          attempt_number?: number
          completed_at?: string | null
          created_at?: string | null
          exam_id?: string
          graded_out_of?: number
          id?: string
          lesson_id?: string | null
          mcq_score?: number | null
          mcq_total?: number | null
          score_scaled?: number | null
          time_spent_seconds?: number | null
          total_possible?: number | null
          total_score?: number | null
          user_id?: string
          viewed_before?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_evaluations_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_evaluations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      establishments_directory: {
        Row: {
          approval_status: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          type: string | null
        }
        Insert: {
          approval_status?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          type?: string | null
        }
        Update: {
          approval_status?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_create_parent_link: {
        Args: {
          p_child_identifier: string
          p_child_name?: string
          p_parent_identifier: string
        }
        Returns: Json
      }
      admin_delete_parent_link: { Args: { p_link_id: string }; Returns: Json }
      admin_link_parent_child: {
        Args: { p_child_identifier: string; p_link_id: string }
        Returns: Json
      }
      admin_link_user_to_establishment: {
        Args: {
          p_email: string
          p_establishment_id: string
          p_grant_school_admin?: boolean
          p_make_owner?: boolean
        }
        Returns: Json
      }
      admin_list_commercials: {
        Args: never
        Returns: {
          active_referrals: number
          email: string
          first_name: string
          last_name: string
          last_referral_at: string
          paid_earned: number
          pending_earned: number
          referred_count: number
          total_earned: number
          user_id: string
          username: string
        }[]
      }
      admin_list_establishment_users: {
        Args: { p_establishment_id: string }
        Returns: {
          email: string
          first_name: string
          id: string
          is_owner: boolean
          is_school_admin: boolean
          last_name: string
        }[]
      }
      admin_list_parent_links: {
        Args: never
        Returns: {
          child_email: string
          child_name: string
          child_user_id: string
          child_username: string
          created_at: string
          link_id: string
          parent_email: string
          parent_id: string
          parent_name: string
          parent_username: string
          status: string
        }[]
      }
      admin_school_activity: {
        Args: never
        Returns: {
          approval_status: string
          average_percent: number
          challenges_active: number
          challenges_total: number
          city: string
          classes_total: number
          commissions_pending: number
          commissions_total: number
          created_at: string
          establishment_id: string
          evaluations_total: number
          is_demo: boolean
          last_activity: string
          lessons_completed: number
          lessons_total: number
          linked_accounts: number
          name: string
          owner_email: string
          referral_code: string
          students_active: number
          students_total: number
        }[]
      }
      admin_school_challenges: {
        Args: never
        Returns: {
          average_percent: number
          ends_at: string
          establishment_id: string
          id: string
          participants: number
          school_name: string
          scope: string
          starts_at: string
          status: string
          title: string
        }[]
      }
      admin_set_commercial: {
        Args: { p_enabled: boolean; p_user_id: string }
        Returns: Json
      }
      admin_set_establishment_approval: {
        Args: {
          p_establishment_id: string
          p_reason?: string
          p_status: string
        }
        Returns: Json
      }
      admin_unlink_user_from_establishment: {
        Args: { p_establishment_id: string; p_user_id: string }
        Returns: Json
      }
      broadcast_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_title: string
          p_type: string
          p_user_ids: string[]
        }
        Returns: number
      }
      change_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: Json
      }
      check_subscription_expiry: { Args: never; Returns: number }
      commercial_overview: { Args: never; Returns: Json }
      commercial_referrals: {
        Args: never
        Returns: {
          amount: number
          commission: number
          commission_status: string
          expires_at: string
          plan_name: string
          referred_name: string
          referred_username: string
          status: string
          subscribed_at: string
          subscription_id: string
        }[]
      }
      current_establishment_id: { Args: never; Returns: string }
      establishment_results: {
        Args: { p_establishment_id: string }
        Returns: {
          class_id: string
          class_name: string
          completed_at: string
          exam_id: string
          exam_title: string
          percent: number
          possible: number
          score: number
          student_id: string
          student_name: string
          subject_id: string
          subject_name: string
        }[]
      }
      establishment_student_activity: {
        Args: { p_establishment_id: string }
        Returns: {
          class_id: string
          last_viewed_at: string
          lesson_id: string
          lesson_title: string
          progress_percent: number
          status: string
          student_id: string
          student_name: string
          subject_name: string
          time_spent_seconds: number
        }[]
      }
      find_affiliate_by_username: {
        Args: { _username: string }
        Returns: {
          id: string
          username: string
        }[]
      }
      get_public_profiles: {
        Args: { _ids: string[] }
        Returns: {
          first_name: string
          id: string
          last_name: string
          profile_photo_url: string
          username: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      harmonize_exam_data: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_establishment_admin: {
        Args: { _establishment_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      parent_child_results: {
        Args: { p_child_user_id: string }
        Returns: {
          completed_at: string
          evaluation_id: string
          exam_title: string
          lesson_title: string
          percent: number
          possible: number
          score: number
          subject_name: string
          time_spent_seconds: number
        }[]
      }
      parent_children_overview: {
        Args: never
        Returns: {
          average_percent: number
          child_name: string
          child_user_id: string
          child_username: string
          class_name: string
          evaluations_count: number
          last_activity: string
          lessons_completed: number
          lessons_started: number
          link_id: string
          status: string
          time_spent_seconds: number
        }[]
      }
      register_establishment: {
        Args: {
          p_city?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_country?: string
          p_name: string
          p_type?: string
        }
        Returns: Json
      }
      search_affiliate_usernames: {
        Args: { _term: string }
        Returns: {
          id: string
          username: string
        }[]
      }
      send_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      transition_subscription_plan:
        | { Args: { p_new_plan_id: string; p_user_id: string }; Returns: Json }
        | {
            Args: {
              p_new_plan_id: string
              p_referred_by?: string
              p_user_id: string
            }
            Returns: Json
          }
    }
    Enums: {
      app_role:
        | "admin"
        | "teacher"
        | "student"
        | "editor"
        | "school_admin"
        | "commercial"
        | "parent"
      feedback_status: "new" | "reviewed" | "replied"
      payment_provider: "mtn_momo" | "orange_money" | "mesomb"
      subscription_status: "active" | "expired" | "canceled" | "pending"
      transaction_status:
        | "pending"
        | "completed"
        | "failed"
        | "refunded"
        | "processing"
      user_role: "student" | "parent" | "teacher" | "admin"
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
    Enums: {
      app_role: [
        "admin",
        "teacher",
        "student",
        "editor",
        "school_admin",
        "commercial",
        "parent",
      ],
      feedback_status: ["new", "reviewed", "replied"],
      payment_provider: ["mtn_momo", "orange_money", "mesomb"],
      subscription_status: ["active", "expired", "canceled", "pending"],
      transaction_status: [
        "pending",
        "completed",
        "failed",
        "refunded",
        "processing",
      ],
      user_role: ["student", "parent", "teacher", "admin"],
    },
  },
} as const
