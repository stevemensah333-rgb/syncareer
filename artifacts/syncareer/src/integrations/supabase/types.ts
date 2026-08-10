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
      alumni_outcomes_cache: {
        Row: {
          common_roles: Json
          created_at: string
          expires_at: string
          generated_at: string
          id: string
          major: string
          paths_summary: string | null
          region: string
          salary_observations: string | null
          sources: Json
          top_employers: Json
          university_name: string
          updated_at: string
        }
        Insert: {
          common_roles?: Json
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          major: string
          paths_summary?: string | null
          region?: string
          salary_observations?: string | null
          sources?: Json
          top_employers?: Json
          university_name: string
          updated_at?: string
        }
        Update: {
          common_roles?: Json
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          major?: string
          paths_summary?: string | null
          region?: string
          salary_observations?: string | null
          sources?: Json
          top_employers?: Json
          university_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_responses: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          question_id: number
          selected_value: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          question_id: number
          selected_value: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          question_id?: number
          selected_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          personality_score_json: Json
          primary_interest: string | null
          secondary_interest: string | null
          skills_score_json: Json
          tertiary_interest: string | null
          updated_at: string
          user_id: string
          work_interest_score_json: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          personality_score_json?: Json
          primary_interest?: string | null
          secondary_interest?: string | null
          skills_score_json?: Json
          tertiary_interest?: string | null
          updated_at?: string
          user_id: string
          work_interest_score_json?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          personality_score_json?: Json
          primary_interest?: string | null
          secondary_interest?: string | null
          skills_score_json?: Json
          tertiary_interest?: string | null
          updated_at?: string
          user_id?: string
          work_interest_score_json?: Json
        }
        Relationships: []
      }
      career_guidance_sessions: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          messages: Json
          risk_notes: string | null
          session_type: string
          structured_output: Json | null
          suggested_next_skill: string | null
          top_recommendation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          messages?: Json
          risk_notes?: string | null
          session_type?: string
          structured_output?: Json | null
          suggested_next_skill?: string | null
          top_recommendation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          messages?: Json
          risk_notes?: string | null
          session_type?: string
          structured_output?: Json | null
          suggested_next_skill?: string | null
          top_recommendation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_skills: {
        Row: {
          career_id: string
          created_at: string
          id: string
          skill_id: string
        }
        Insert: {
          career_id: string
          created_at?: string
          id?: string
          skill_id: string
        }
        Update: {
          career_id?: string
          created_at?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_skills_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      careers: {
        Row: {
          created_at: string
          description: string
          id: string
          industry: string
          required_skills: string[]
          riasec_profile: Json
          salary_range: string | null
          suggested_majors: string[]
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          industry: string
          required_skills?: string[]
          riasec_profile?: Json
          salary_range?: string | null
          suggested_majors?: string[]
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          industry?: string
          required_skills?: string[]
          riasec_profile?: Json
          salary_range?: string | null
          suggested_majors?: string[]
          title?: string
        }
        Relationships: []
      }
      counsellor_availability: {
        Row: {
          counsellor_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
        }
        Insert: {
          counsellor_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
        }
        Update: {
          counsellor_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "counsellor_availability_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_availability_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_availability_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      counsellor_bookings: {
        Row: {
          counsellor_id: string
          created_at: string
          day_of_week: number | null
          id: string
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          updated_at: string
          user_contact: string
          user_id: string
          user_name: string
        }
        Insert: {
          counsellor_id: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          user_contact: string
          user_id: string
          user_name: string
        }
        Update: {
          counsellor_id?: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          user_contact?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "counsellor_bookings_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_bookings_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_bookings_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      counsellor_credentials: {
        Row: {
          counsellor_id: string
          created_at: string
          credential_type: string
          document_name: string
          document_url: string
          expiry_date: string | null
          id: string
          issue_date: string
          issuer_name: string
          notes: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          counsellor_id: string
          created_at?: string
          credential_type: string
          document_name: string
          document_url: string
          expiry_date?: string | null
          id?: string
          issue_date: string
          issuer_name: string
          notes?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          counsellor_id?: string
          created_at?: string
          credential_type?: string
          document_name?: string
          document_url?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          issuer_name?: string
          notes?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      counsellor_details: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string
          created_at: string
          full_name: string
          hiring_price: number | null
          id: string
          location: string | null
          meeting_link: string | null
          meeting_platform: string | null
          phone_number: string
          specialization: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code: string
          created_at?: string
          full_name: string
          hiring_price?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_platform?: string | null
          phone_number: string
          specialization?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string
          created_at?: string
          full_name?: string
          hiring_price?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_platform?: string | null
          phone_number?: string
          specialization?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      counsellor_messages: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: []
      }
      counsellor_reviews: {
        Row: {
          counsellor_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          counsellor_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          counsellor_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counsellor_reviews_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_reviews_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_reviews_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      counsellor_sessions: {
        Row: {
          amount_paid: number | null
          client_id: string
          counsellor_id: string
          created_at: string
          duration_minutes: number
          id: string
          meeting_link: string | null
          payment_status: string | null
          scheduled_at: string
          session_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          client_id: string
          counsellor_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          payment_status?: string | null
          scheduled_at: string
          session_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          client_id?: string
          counsellor_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          payment_status?: string | null
          scheduled_at?: string
          session_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counsellor_sessions_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_sessions_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_sessions_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_id: string
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          notes: string | null
          resume_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posting_skills: {
        Row: {
          created_at: string
          id: string
          job_posting_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_posting_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_posting_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_skills_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posting_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          application_deadline: string | null
          company_domain: string | null
          company_name: string | null
          created_at: string
          department: string | null
          description: string
          employer_id: string | null
          employment_type: string
          experience_level: string | null
          external_id: string | null
          id: string
          is_external: boolean
          location: string
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          skills: string[] | null
          source: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          company_domain?: string | null
          company_name?: string | null
          created_at?: string
          department?: string | null
          description: string
          employer_id?: string | null
          employment_type: string
          experience_level?: string | null
          external_id?: string | null
          id?: string
          is_external?: boolean
          location: string
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          source?: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          company_domain?: string | null
          company_name?: string | null
          created_at?: string
          department?: string | null
          description?: string
          employer_id?: string | null
          employment_type?: string
          experience_level?: string | null
          external_id?: string | null
          id?: string
          is_external?: boolean
          location?: string
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          source?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_intelligence_cache: {
        Row: {
          career_outlook: Json
          created_at: string
          data_confidence: string | null
          demand_forecast: Json
          expires_at: string
          generated_at: string
          hard_skills: Json
          id: string
          major: string
          market_insights: Json
          region: string
          region_summary: string | null
          salary_data: Json
          soft_skills: Json
          updated_at: string
        }
        Insert: {
          career_outlook?: Json
          created_at?: string
          data_confidence?: string | null
          demand_forecast?: Json
          expires_at?: string
          generated_at?: string
          hard_skills?: Json
          id?: string
          major: string
          market_insights?: Json
          region?: string
          region_summary?: string | null
          salary_data?: Json
          soft_skills?: Json
          updated_at?: string
        }
        Update: {
          career_outlook?: Json
          created_at?: string
          data_confidence?: string | null
          demand_forecast?: Json
          expires_at?: string
          generated_at?: string
          hard_skills?: Json
          id?: string
          major?: string
          market_insights?: Json
          region?: string
          region_summary?: string | null
          salary_data?: Json
          soft_skills?: Json
          updated_at?: string
        }
        Relationships: []
      }
      mock_interviews: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          difficulty: string
          duration_seconds: number | null
          feedback: Json | null
          id: string
          industry: string | null
          job_role: string
          overall_score: number | null
          questions: Json
          status: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          difficulty?: string
          duration_seconds?: number | null
          feedback?: Json | null
          id?: string
          industry?: string | null
          job_role: string
          overall_score?: number | null
          questions?: Json
          status?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          difficulty?: string
          duration_seconds?: number | null
          feedback?: Json | null
          id?: string
          industry?: string | null
          job_role?: string
          overall_score?: number | null
          questions?: Json
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          application_updates: boolean
          counsellor_bookings: boolean
          created_at: string
          email_enabled: boolean
          id: string
          interview_reminders: boolean
          last_digest_sent_at: string | null
          marketing_emails: boolean
          push_enabled: boolean
          system_announcements: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          application_updates?: boolean
          counsellor_bookings?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          interview_reminders?: boolean
          last_digest_sent_at?: string | null
          marketing_emails?: boolean
          push_enabled?: boolean
          system_announcements?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          application_updates?: boolean
          counsellor_bookings?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          interview_reminders?: boolean
          last_digest_sent_at?: string | null
          marketing_emails?: boolean
          push_enabled?: boolean
          system_announcements?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          priority: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          priority?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          priority?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          email: string
          id: string
          metadata: Json | null
          payment_method: string | null
          paystack_reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          email: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          paystack_reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          paystack_reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          onboarding_completed: boolean | null
          referral_code: string | null
          updated_at: string | null
          user_type: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          referral_code?: string | null
          updated_at?: string | null
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          referral_code?: string | null
          updated_at?: string | null
          user_type?: string | null
          username?: string | null
        }
        Relationships: []
      }
      qualifications: {
        Row: {
          created_at: string | null
          degree_type: string
          id: string
          is_current: boolean | null
          major: string
          school: string
          updated_at: string | null
          user_id: string
          year_of_admission: number | null
          year_of_completion: number | null
        }
        Insert: {
          created_at?: string | null
          degree_type: string
          id?: string
          is_current?: boolean | null
          major: string
          school: string
          updated_at?: string | null
          user_id: string
          year_of_admission?: number | null
          year_of_completion?: number | null
        }
        Update: {
          created_at?: string | null
          degree_type?: string
          id?: string
          is_current?: boolean | null
          major?: string
          school?: string
          updated_at?: string | null
          user_id?: string
          year_of_admission?: number | null
          year_of_completion?: number | null
        }
        Relationships: []
      }
      recommendation_outcomes: {
        Row: {
          acted_at: string | null
          confidence_score: number
          created_at: string
          id: string
          outcome: string | null
          outcome_at: string | null
          outcome_details: Json | null
          recommendation_category: string
          recommendation_type: string
          recommended_item_id: string | null
          recommended_item_title: string
          user_action: string | null
          user_id: string
        }
        Insert: {
          acted_at?: string | null
          confidence_score?: number
          created_at?: string
          id?: string
          outcome?: string | null
          outcome_at?: string | null
          outcome_details?: Json | null
          recommendation_category?: string
          recommendation_type?: string
          recommended_item_id?: string | null
          recommended_item_title: string
          user_action?: string | null
          user_id: string
        }
        Update: {
          acted_at?: string | null
          confidence_score?: number
          created_at?: string
          id?: string
          outcome?: string | null
          outcome_at?: string | null
          outcome_details?: Json | null
          recommendation_category?: string
          recommendation_type?: string
          recommended_item_id?: string | null
          recommended_item_title?: string
          user_action?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referee_id: string | null
          referral_code: string
          referrer_id: string
          reward_granted: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referee_id?: string | null
          referral_code: string
          referrer_id: string
          reward_granted?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referee_id?: string | null
          referral_code?: string
          referrer_id?: string
          reward_granted?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          achievements: Json
          created_at: string
          education: Json
          experience: Json
          id: string
          is_primary: boolean | null
          personal_info: Json
          projects: Json
          references_section: string | null
          skills: Json
          template: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: Json
          created_at?: string
          education?: Json
          experience?: Json
          id?: string
          is_primary?: boolean | null
          personal_info?: Json
          projects?: Json
          references_section?: string | null
          skills?: Json
          template?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: Json
          created_at?: string
          education?: Json
          experience?: Json
          id?: string
          is_primary?: boolean | null
          personal_info?: Json
          projects?: Json
          references_section?: string | null
          skills?: Json
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_endorsements: {
        Row: {
          created_at: string
          endorser_id: string
          id: string
          skill_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endorser_id: string
          id?: string
          skill_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          endorser_id?: string
          id?: string
          skill_name?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_evidence: {
        Row: {
          created_at: string
          id: string
          signal_strength: number
          skill_id: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          signal_strength?: number
          skill_id: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          signal_strength?: number
          skill_id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_evidence_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_taxonomy: {
        Row: {
          canonical_name: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          canonical_name: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          canonical_name?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      student_details: {
        Row: {
          created_at: string | null
          degree_type: string
          expected_completion: number | null
          id: string
          major: string
          school: string | null
          updated_at: string | null
          user_id: string
          year_of_admission: number | null
        }
        Insert: {
          created_at?: string | null
          degree_type: string
          expected_completion?: number | null
          id?: string
          major: string
          school?: string | null
          updated_at?: string | null
          user_id: string
          year_of_admission?: number | null
        }
        Update: {
          created_at?: string | null
          degree_type?: string
          expected_completion?: number | null
          id?: string
          major?: string
          school?: string | null
          updated_at?: string | null
          user_id?: string
          year_of_admission?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_id: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      university_insights: {
        Row: {
          created_at: string
          graduate_outcomes: Json
          id: string
          major: string
          top_careers: Json
          university_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          graduate_outcomes?: Json
          id?: string
          major: string
          top_careers?: Json
          university_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          graduate_outcomes?: Json
          id?: string
          major?: string
          top_careers?: Json
          university_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          month: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          month: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          month?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feature_name: string
          id: string
          response_type: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feature_name: string
          id?: string
          response_type: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feature_name?: string
          id?: string
          response_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_intelligence_profiles: {
        Row: {
          career_clusters: Json
          created_at: string
          exploration_score: number
          feature_weights: Json
          id: string
          last_computed_at: string
          learning_momentum: number
          maturity_level: string
          skill_mastery_json: Json
          success_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          career_clusters?: Json
          created_at?: string
          exploration_score?: number
          feature_weights?: Json
          id?: string
          last_computed_at?: string
          learning_momentum?: number
          maturity_level?: string
          skill_mastery_json?: Json
          success_rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          career_clusters?: Json
          created_at?: string
          exploration_score?: number
          feature_weights?: Json
          id?: string
          last_computed_at?: string
          learning_momentum?: number
          maturity_level?: string
          skill_mastery_json?: Json
          success_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_skill_map: {
        Row: {
          confidence_score: number | null
          last_updated_at: string
          skill_id: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          last_updated_at?: string
          skill_id: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          last_updated_at?: string
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skill_map_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          category: string
          created_at: string
          id: string
          proficiency: string
          skill_name: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          proficiency?: string
          skill_name: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          proficiency?: string
          skill_name?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      counsellor_booking_view: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          hiring_price: number | null
          id: string | null
          location: string | null
          meeting_link: string | null
          specialization: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          hiring_price?: number | null
          id?: string | null
          location?: string | null
          meeting_link?: string | null
          specialization?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          full_name?: string | null
          hiring_price?: number | null
          id?: string | null
          location?: string | null
          meeting_link?: string | null
          specialization?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      counsellor_bookings_public: {
        Row: {
          counsellor_id: string | null
          created_at: string | null
          id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          counsellor_id?: string | null
          created_at?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          counsellor_id?: string | null
          created_at?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counsellor_bookings_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_booking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_bookings_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counsellor_bookings_counsellor_id_fkey"
            columns: ["counsellor_id"]
            isOneToOne: false
            referencedRelation: "counsellor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      counsellor_profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          hiring_price: number | null
          id: string | null
          location: string | null
          specialization: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          hiring_price?: number | null
          id?: string | null
          location?: string | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          hiring_price?: number | null
          id?: string | null
          location?: string | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_referral_code: { Args: never; Returns: string }
      get_profile_user_type: { Args: { _id: string }; Returns: string }
      migrate_skills_to_relational: {
        Args: never
        Returns: {
          mapped_count: number
          source_table: string
          unmapped_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_counsellor_owner: { Args: { counsellor_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_has_counsellor_booking: {
        Args: { counsellor_details_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employer" | "job_seeker"
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
    Enums: {
      app_role: ["admin", "employer", "job_seeker"],
    },
  },
} as const
