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
      assessment_results: {
        Row: {
          answers: Json
          application_id: string | null
          assessment_id: string
          candidate_id: string
          completed_at: string | null
          id: string
          passed: boolean | null
          score: number | null
          started_at: string
        }
        Insert: {
          answers?: Json
          application_id?: string | null
          assessment_id: string
          candidate_id: string
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
        }
        Update: {
          answers?: Json
          application_id?: string | null
          assessment_id?: string
          candidate_id?: string
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "skills_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "skills_assessments_public"
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
          phone_number?: string
          specialization?: string | null
          updated_at?: string
          user_id?: string
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
      employer_details: {
        Row: {
          company_description: string | null
          company_email: string | null
          company_location: string | null
          company_name: string
          company_phone: string | null
          company_size: string | null
          company_website: string | null
          created_at: string | null
          id: string
          industry: string | null
          job_title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_description?: string | null
          company_email?: string | null
          company_location?: string | null
          company_name: string
          company_phone?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_description?: string | null
          company_email?: string | null
          company_location?: string | null
          company_name?: string
          company_phone?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          application_id: string
          candidate_feedback: string | null
          created_at: string
          duration_minutes: number
          id: string
          interview_type: string
          interviewer_notes: string | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          candidate_feedback?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          interview_type?: string
          interviewer_notes?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          candidate_feedback?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          interview_type?: string
          interviewer_notes?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          department: string | null
          description: string
          employer_id: string
          employment_type: string
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
          created_at?: string
          department?: string | null
          description: string
          employer_id: string
          employment_type: string
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
          created_at?: string
          department?: string | null
          description?: string
          employer_id?: string
          employment_type?: string
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
      learning_activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          duration_minutes: number | null
          id: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_goals: {
        Row: {
          created_at: string
          current_count: number
          goal_type: string
          id: string
          target_count: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          current_count?: number
          goal_type: string
          id?: string
          target_count?: number
          updated_at?: string
          user_id: string
          week_start?: string
        }
        Update: {
          created_at?: string
          current_count?: number
          goal_type?: string
          id?: string
          target_count?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      learning_module_completions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_number: number
          passed: boolean
          path_id: string
          quiz_answers: Json
          quiz_questions: Json
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_number: number
          passed?: boolean
          path_id: string
          quiz_answers?: Json
          quiz_questions?: Json
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_number?: number
          passed?: boolean
          path_id?: string
          quiz_answers?: Json
          quiz_questions?: Json
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_module_completions_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          completed_modules: number
          created_at: string
          id: string
          last_module_completed_at: string | null
          milestone_level: string
          path_title: string
          total_modules: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_modules?: number
          created_at?: string
          id?: string
          last_module_completed_at?: string | null
          milestone_level?: string
          path_title: string
          total_modules?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_modules?: number
          created_at?: string
          id?: string
          last_module_completed_at?: string | null
          milestone_level?: string
          path_title?: string
          total_modules?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          total_learning_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_learning_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_learning_days?: number
          updated_at?: string
          user_id?: string
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
      portfolio_projects: {
        Row: {
          created_at: string
          description: string
          github_url: string | null
          id: string
          is_verified: boolean | null
          project_url: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          github_url?: string | null
          id?: string
          is_verified?: boolean | null
          project_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          github_url?: string | null
          id?: string
          is_verified?: boolean | null
          project_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          project_id: string
          rating: number
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          project_id: string
          rating: number
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          project_id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
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
      skill_question_bank: {
        Row: {
          career_path: string
          correct_index: number
          created_at: string
          difficulty: string
          explanation: string
          id: string
          module_level: number
          options: Json
          question: string
          skill_name: string
        }
        Insert: {
          career_path: string
          correct_index: number
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          module_level?: number
          options?: Json
          question: string
          skill_name: string
        }
        Update: {
          career_path?: string
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          module_level?: number
          options?: Json
          question?: string
          skill_name?: string
        }
        Relationships: []
      }
      skills_assessments: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          employer_id: string
          id: string
          is_active: boolean | null
          passing_score: number | null
          questions: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          employer_id: string
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          questions?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          employer_id?: string
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          questions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      unmapped_skills_log: {
        Row: {
          created_at: string
          id: string
          raw_skill_text: string
          resolved: boolean
          resolved_at: string | null
          resolved_skill_id: string | null
          source_id: string
          source_table: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_skill_text: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_skill_id?: string | null
          source_id: string
          source_table: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_skill_text?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_skill_id?: string | null
          source_id?: string
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "unmapped_skills_log_resolved_skill_id_fkey"
            columns: ["resolved_skill_id"]
            isOneToOne: false
            referencedRelation: "skills_taxonomy"
            referencedColumns: ["id"]
          },
        ]
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
      user_course_progress: {
        Row: {
          career_path: string
          course_title: string
          course_url: string | null
          created_at: string
          id: string
          skill_name: string
          status: string
          updated_at: string
          user_id: string
          validated_at: string | null
        }
        Insert: {
          career_path: string
          course_title: string
          course_url?: string | null
          created_at?: string
          id?: string
          skill_name: string
          status?: string
          updated_at?: string
          user_id: string
          validated_at?: string | null
        }
        Update: {
          career_path?: string
          course_title?: string
          course_url?: string | null
          created_at?: string
          id?: string
          skill_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          validated_at?: string | null
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
      user_stats: {
        Row: {
          created_at: string
          endorsements_received: number
          id: string
          network_count: number
          skill_score: number
          skills_verified: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endorsements_received?: number
          id?: string
          network_count?: number
          skill_score?: number
          skills_verified?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endorsements_received?: number
          id?: string
          network_count?: number
          skill_score?: number
          skills_verified?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      candidate_interview_view: {
        Row: {
          application_id: string | null
          candidate_feedback: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string | null
          interview_type: string | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          candidate_feedback?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string | null
          interview_type?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          candidate_feedback?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string | null
          interview_type?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
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
      skills_assessments_public: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          employer_id: string | null
          id: string | null
          is_active: boolean | null
          passing_score: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          employer_id?: string | null
          id?: string | null
          is_active?: boolean | null
          passing_score?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          employer_id?: string | null
          id?: string | null
          is_active?: boolean | null
          passing_score?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_counsellor_owner: { Args: { counsellor_id: string }; Returns: boolean }
      migrate_skills_to_relational: {
        Args: never
        Returns: {
          mapped_count: number
          source_table: string
          unmapped_count: number
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
