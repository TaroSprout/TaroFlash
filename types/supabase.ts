export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cards: {
        Row: {
          back_text: string | null
          created_at: string
          deck_id: number | null
          front_text: string | null
          id: number
          member_id: string | null
          note: string | null
          rank: number
          updated_at: string | null
        }
        Insert: {
          back_text?: string | null
          created_at?: string
          deck_id?: number | null
          front_text?: string | null
          id?: number
          member_id?: string | null
          note?: string | null
          rank: number
          updated_at?: string | null
        }
        Update: {
          back_text?: string | null
          created_at?: string
          deck_id?: number | null
          front_text?: string | null
          id?: number
          member_id?: string | null
          note?: string | null
          rank?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_review_pacing: {
        Row: {
          deck_id: number
          desired_retention_override: number | null
          has_max_new_override: boolean
          has_max_reviews_override: boolean
          learning_steps_override: string[] | null
          max_new_per_day_override: number | null
          max_reviews_per_day_override: number | null
          relearning_steps_override: string[] | null
          review_pacing_preset_id: number | null
        }
        Insert: {
          deck_id: number
          desired_retention_override?: number | null
          has_max_new_override?: boolean
          has_max_reviews_override?: boolean
          learning_steps_override?: string[] | null
          max_new_per_day_override?: number | null
          max_reviews_per_day_override?: number | null
          relearning_steps_override?: string[] | null
          review_pacing_preset_id?: number | null
        }
        Update: {
          deck_id?: number
          desired_retention_override?: number | null
          has_max_new_override?: boolean
          has_max_reviews_override?: boolean
          learning_steps_override?: string[] | null
          max_new_per_day_override?: number | null
          max_reviews_per_day_override?: number | null
          relearning_steps_override?: string[] | null
          review_pacing_preset_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deck_review_pacing_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: true
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_review_pacing_review_pacing_preset_id_fkey"
            columns: ["review_pacing_preset_id"]
            isOneToOne: false
            referencedRelation: "review_pacing_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          card_attributes: Json | null
          cover_config: Json | null
          created_at: string
          description: string | null
          has_image: boolean | null
          id: number
          is_public: boolean
          member_id: string
          rank: number
          study_config: Json | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          card_attributes?: Json | null
          cover_config?: Json | null
          created_at?: string
          description?: string | null
          has_image?: boolean | null
          id?: number
          is_public?: boolean
          member_id: string
          rank: number
          study_config?: Json | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          card_attributes?: Json | null
          cover_config?: Json | null
          created_at?: string
          description?: string | null
          has_image?: boolean | null
          id?: number
          is_public?: boolean
          member_id?: string
          rank?: number
          study_config?: Json | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_items: {
        Row: {
          body: string | null
          created_at: string
          id: number
          member_id: string
          status: Database["public"]["Enums"]["feedback_status"]
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
          visibility: Database["public"]["Enums"]["feedback_visibility"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          member_id: string
          status?: Database["public"]["Enums"]["feedback_status"]
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
          visibility?: Database["public"]["Enums"]["feedback_visibility"]
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          member_id?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          title?: string
          type?: Database["public"]["Enums"]["feedback_type"]
          visibility?: Database["public"]["Enums"]["feedback_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "feedback_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_votes: {
        Row: {
          created_at: string
          feedback_id: number
          member_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: number
          member_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: number
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_votes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_collections: {
        Row: {
          created_at: string
          id: number
          last_lesson_id: number | null
          last_position_seconds: number
          member_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          last_lesson_id?: number | null
          last_position_seconds?: number
          member_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          last_lesson_id?: number | null
          last_position_seconds?: number
          member_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_collections_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_collections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          audio_path: string
          chunk_cursor: number
          chunks: Json
          collection_id: number
          created_at: string
          error_code: string | null
          id: number
          lang: string | null
          member_id: string
          phase: string | null
          position: number
          script: string
          status: string
          title: string
          transcript: Json
          updated_at: string
        }
        Insert: {
          audio_path: string
          chunk_cursor?: number
          chunks?: Json
          collection_id: number
          created_at?: string
          error_code?: string | null
          id?: number
          lang?: string | null
          member_id: string
          phase?: string | null
          position: number
          script?: string
          status?: string
          title: string
          transcript?: Json
          updated_at?: string
        }
        Update: {
          audio_path?: string
          chunk_cursor?: number
          chunks?: Json
          collection_id?: number
          created_at?: string
          error_code?: string | null
          id?: number
          lang?: string | null
          member_id?: string
          phase?: string | null
          position?: number
          script?: string
          status?: string
          title?: string
          transcript?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "lesson_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "lesson_collections_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          bucket: string
          card_id: number | null
          created_at: string
          deck_id: number | null
          deleted_at: string | null
          id: number
          lesson_id: number | null
          member_id: string | null
          path: string
          slot: Database["public"]["Enums"]["media_slot"] | null
        }
        Insert: {
          bucket: string
          card_id?: number | null
          created_at?: string
          deck_id?: number | null
          deleted_at?: string | null
          id?: number
          lesson_id?: number | null
          member_id?: string | null
          path: string
          slot?: Database["public"]["Enums"]["media_slot"] | null
        }
        Update: {
          bucket?: string
          card_id?: number | null
          created_at?: string
          deck_id?: number | null
          deleted_at?: string | null
          id?: number
          lesson_id?: number | null
          member_id?: string | null
          path?: string
          slot?: Database["public"]["Enums"]["media_slot"] | null
        }
        Relationships: [
          {
            foreignKeyName: "media_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_with_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_url: string | null
          cover_config: Json | null
          created_at: string
          description: string | null
          display_name: string
          email: string | null
          id: string
          plan: string
          preferences: Json
          role: Database["public"]["Enums"]["member_role"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          cover_config?: Json | null
          created_at?: string
          description?: string | null
          display_name: string
          email?: string | null
          id: string
          plan?: string
          preferences?: Json
          role?: Database["public"]["Enums"]["member_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          cover_config?: Json | null
          created_at?: string
          description?: string | null
          display_name?: string
          email?: string | null
          id?: string
          plan?: string
          preferences?: Json
          role?: Database["public"]["Enums"]["member_role"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          cards_per_deck_limit: number | null
          created_at: string
          deck_limit: number | null
          id: string
          is_active: boolean
          stripe_price_id: string | null
        }
        Insert: {
          cards_per_deck_limit?: number | null
          created_at?: string
          deck_limit?: number | null
          id: string
          is_active?: boolean
          stripe_price_id?: string | null
        }
        Update: {
          cards_per_deck_limit?: number | null
          created_at?: string
          deck_limit?: number | null
          id?: string
          is_active?: boolean
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          id: number
          item_id: number | null
          member_id: string | null
          quantity: number | null
        }
        Insert: {
          id?: number
          item_id?: number | null
          member_id?: string | null
          quantity?: number | null
        }
        Update: {
          id?: number
          item_id?: number | null
          member_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      review_logs: {
        Row: {
          card_id: number
          created_at: string
          difficulty: number | null
          due: string
          id: number
          member_id: string
          rating: number
          review: string
          scheduled_days: number | null
          stability: number | null
          state: number
        }
        Insert: {
          card_id: number
          created_at?: string
          difficulty?: number | null
          due: string
          id?: number
          member_id: string
          rating: number
          review: string
          scheduled_days?: number | null
          stability?: number | null
          state: number
        }
        Update: {
          card_id?: number
          created_at?: string
          difficulty?: number | null
          due?: string
          id?: number
          member_id?: string
          rating?: number
          review?: string
          scheduled_days?: number | null
          stability?: number | null
          state?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_with_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      review_pacing_presets: {
        Row: {
          created_at: string
          desired_retention: number
          id: number
          is_system: boolean
          learning_steps: string[]
          max_new_per_day: number | null
          max_reviews_per_day: number | null
          member_id: string | null
          name: string
          relearning_steps: string[]
        }
        Insert: {
          created_at?: string
          desired_retention: number
          id?: number
          is_system?: boolean
          learning_steps: string[]
          max_new_per_day?: number | null
          max_reviews_per_day?: number | null
          member_id?: string | null
          name: string
          relearning_steps: string[]
        }
        Update: {
          created_at?: string
          desired_retention?: number
          id?: number
          is_system?: boolean
          learning_steps?: string[]
          max_new_per_day?: number | null
          max_reviews_per_day?: number | null
          member_id?: string | null
          name?: string
          relearning_steps?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "review_pacing_presets_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          card_id: number | null
          created_at: string
          difficulty: number | null
          due: string | null
          elapsed_days: number | null
          id: number
          lapses: number | null
          last_review: string | null
          learning_steps: number | null
          member_id: string | null
          reps: number | null
          scheduled_days: number | null
          stability: number | null
          state: number
        }
        Insert: {
          card_id?: number | null
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number | null
          id?: number
          lapses?: number | null
          last_review?: string | null
          learning_steps?: number | null
          member_id?: string | null
          reps?: number | null
          scheduled_days?: number | null
          stability?: number | null
          state?: number
        }
        Update: {
          card_id?: number | null
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number | null
          id?: number
          lapses?: number | null
          last_review?: string | null
          learning_steps?: number | null
          member_id?: string | null
          reps?: number | null
          scheduled_days?: number | null
          stability?: number | null
          state?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards_with_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: Database["public"]["Enums"]["shop_category"] | null
          description: string | null
          id: number
          item_key: string | null
          name: string | null
          price: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["shop_category"] | null
          description?: string | null
          id?: number
          item_key?: string | null
          name?: string | null
          price?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["shop_category"] | null
          description?: string | null
          id?: number
          item_key?: string | null
          name?: string | null
          price?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      cards_with_images: {
        Row: {
          back_image_bucket: string | null
          back_image_path: string | null
          back_text: string | null
          created_at: string | null
          deck_id: number | null
          front_image_bucket: string | null
          front_image_path: string | null
          front_text: string | null
          id: number | null
          is_duplicate: boolean | null
          member_id: string | null
          rank: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_collections_with_counts: {
        Row: {
          created_at: string | null
          id: number | null
          last_lesson_id: number | null
          last_position_seconds: number | null
          lesson_count: number | null
          member_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number | null
          last_lesson_id?: number | null
          last_position_seconds?: number | null
          lesson_count?: never
          member_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number | null
          last_lesson_id?: number | null
          last_position_seconds?: number | null
          lesson_count?: never
          member_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_collections_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_collections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_or_update_purchase: {
        Args: { item: number; member: string; qty: number }
        Returns: undefined
      }
      auth_plan: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["member_role"]
      }
      bulk_insert_cards_in_deck: {
        Args: { p_cards: Json; p_deck_id: number }
        Returns: {
          back_text: string | null
          created_at: string
          deck_id: number | null
          front_text: string | null
          id: number
          member_id: string | null
          note: string | null
          rank: number
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "cards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      can_manage_members: { Args: never; Returns: boolean }
      can_moderate_feedback: { Args: never; Returns: boolean }
      can_read_lesson_audio: { Args: never; Returns: boolean }
      card_rank_between: {
        Args: {
          p_deck_id: number
          p_left_card_id: number
          p_right_card_id: number
        }
        Returns: number
      }
      create_pending_lesson: {
        Args: {
          p_audio_path: string
          p_chunks?: Json
          p_collection_id: number
          p_lang?: string
          p_script?: string
          p_title: string
        }
        Returns: {
          audio_path: string
          chunk_cursor: number
          chunks: Json
          collection_id: number
          created_at: string
          error_code: string | null
          id: number
          lang: string | null
          member_id: string
          phase: string | null
          position: number
          script: string
          status: string
          title: string
          transcript: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deck_rank_between: {
        Args: {
          p_left_deck_id: number
          p_member_id: string
          p_right_deck_id: number
        }
        Returns: number
      }
      delete_cards_in_deck: {
        Args: { p_deck_id: number; p_except_ids: number[] }
        Returns: number
      }
      delete_deck: { Args: { p_deck_id: number }; Returns: undefined }
      enforce_deck_card_limit: {
        Args: { p_adding: number; p_deck_id: number }
        Returns: undefined
      }
      feedback_items_with_votes: {
        Args: never
        Returns: {
          body: string
          created_at: string
          id: number
          member_avatar: string
          member_display_name: string
          member_id: string
          status: Database["public"]["Enums"]["feedback_status"]
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
          visibility: Database["public"]["Enums"]["feedback_visibility"]
          vote_count: number
          voted_by_me: boolean
        }[]
      }
      find_orphan_storage_objects: {
        Args: { p_limit?: number; p_older_than?: string }
        Returns: {
          bucket: string
          name: string
        }[]
      }
      get_cards_in_deck: {
        Args: {
          p_deck_id: number
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_sort_by?: string
        }
        Returns: {
          back_image_bucket: string
          back_image_path: string
          back_text: string
          created_at: string
          deck_id: number
          front_image_bucket: string
          front_image_path: string
          front_text: string
          id: number
          member_id: string
          rank: number
          review: Json
          updated_at: string
        }[]
      }
      get_member_card_count: {
        Args: {
          p_member_id: string
          p_now?: string
          p_only_due_cards?: boolean
        }
        Returns: number
      }
      get_member_card_index: {
        Args: { p_member_id: string }
        Returns: {
          deck_ids: number[]
          term: string
        }[]
      }
      get_member_decks: {
        Args: { p_today_start: string }
        Returns: {
          card_attributes: Json
          card_count: number
          cover_config: Json
          created_at: string
          description: string
          desired_retention: number
          desired_retention_override: number
          due_count: number
          has_image: boolean
          has_max_new_override: boolean
          has_max_reviews_override: boolean
          id: number
          is_public: boolean
          learning_steps: string[]
          learning_steps_override: string[]
          max_new_per_day: number
          max_new_per_day_override: number
          max_reviews_per_day: number
          max_reviews_per_day_override: number
          member_display_name: string
          member_id: string
          new_reviewed_today_count: number
          rank: number
          relearning_steps: string[]
          relearning_steps_override: string[]
          review_pacing_preset_id: number
          reviewed_today_count: number
          study_config: Json
          tags: string[]
          title: string
          updated_at: string
        }[]
      }
      get_study_session_cards: {
        Args: {
          p_deck_id: number
          p_study_all?: boolean
          p_today_start: string
        }
        Returns: {
          back_image_bucket: string | null
          back_image_path: string | null
          back_text: string | null
          created_at: string | null
          deck_id: number | null
          front_image_bucket: string | null
          front_image_path: string | null
          front_text: string | null
          id: number | null
          is_duplicate: boolean | null
          member_id: string | null
          rank: number | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "cards_with_images"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      insert_card_at: {
        Args: {
          p_anchor_id: number
          p_back_text: string
          p_deck_id: number
          p_front_text: string
          p_note?: string
          p_side: string
        }
        Returns: {
          id: number
          rank: number
        }[]
      }
      invoke_cleanup_media: { Args: never; Returns: undefined }
      invoke_lesson_process: {
        Args: { p_lesson_id: number }
        Returns: undefined
      }
      move_card: {
        Args: { p_anchor_id: number; p_card_id: number; p_side: string }
        Returns: number
      }
      move_cards_to_deck: {
        Args: {
          p_card_ids?: number[]
          p_except_ids?: number[]
          p_source_deck_id?: number
          p_target_deck_id: number
        }
        Returns: undefined
      }
      move_deck: {
        Args: { p_anchor_id: number; p_deck_id: number; p_side: string }
        Returns: number
      }
      reap_stalled_lessons: { Args: never; Returns: number }
      reindex_deck_ranks: { Args: { p_deck_id: number }; Returns: undefined }
      reindex_member_deck_ranks: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      reserve_card: {
        Args: {
          p_deck_id: number
          p_left_card_id: number
          p_right_card_id: number
        }
        Returns: {
          out_id: number
          out_rank: number
        }[]
      }
      reset_deck_reviews: { Args: { p_deck_id: number }; Returns: undefined }
      save_deck: {
        Args: {
          p_card_attributes: Json
          p_cover_config: Json
          p_deck_id: number
          p_description: string
          p_desired_retention_override: number
          p_has_max_new_override: boolean
          p_has_max_reviews_override: boolean
          p_is_public: boolean
          p_learning_steps_override: string[]
          p_max_new_per_day_override: number
          p_max_reviews_per_day_override: number
          p_relearning_steps_override: string[]
          p_review_pacing_preset_id: number
          p_study_config: Json
          p_title: string
        }
        Returns: {
          card_attributes: Json
          card_count: number
          cover_config: Json
          created_at: string
          description: string
          desired_retention: number
          desired_retention_override: number
          due_count: number
          has_image: boolean
          has_max_new_override: boolean
          has_max_reviews_override: boolean
          id: number
          is_public: boolean
          learning_steps: string[]
          learning_steps_override: string[]
          max_new_per_day: number
          max_new_per_day_override: number
          max_reviews_per_day: number
          max_reviews_per_day_override: number
          member_display_name: string
          member_id: string
          new_reviewed_today_count: number
          rank: number
          relearning_steps: string[]
          relearning_steps_override: string[]
          review_pacing_preset_id: number
          reviewed_today_count: number
          study_config: Json
          tags: string[]
          title: string
          updated_at: string
        }[]
      }
      save_review: {
        Args: {
          p_card_id: number
          p_card_state: number
          p_difficulty: number
          p_due: string
          p_elapsed_days: number
          p_lapses: number
          p_last_review: string
          p_learning_steps?: number
          p_log_difficulty: number
          p_log_due: string
          p_log_scheduled_days: number
          p_log_stability: number
          p_rating: number
          p_reps: number
          p_review: string
          p_scheduled_days: number
          p_stability: number
          p_state: number
        }
        Returns: undefined
      }
      submit_feedback: {
        Args: {
          p_body: string
          p_title: string
          p_type: Database["public"]["Enums"]["feedback_type"]
        }
        Returns: {
          body: string | null
          created_at: string
          id: number
          member_id: string
          status: Database["public"]["Enums"]["feedback_status"]
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
          visibility: Database["public"]["Enums"]["feedback_visibility"]
        }
        SetofOptions: {
          from: "*"
          to: "feedback_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_feedback_vote: {
        Args: { p_feedback_id: number }
        Returns: boolean
      }
      update_feedback_item: {
        Args: {
          p_feedback_id: number
          p_status: Database["public"]["Enums"]["feedback_status"]
          p_visibility: Database["public"]["Enums"]["feedback_visibility"]
        }
        Returns: {
          body: string | null
          created_at: string
          id: number
          member_id: string
          status: Database["public"]["Enums"]["feedback_status"]
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
          visibility: Database["public"]["Enums"]["feedback_visibility"]
        }
        SetofOptions: {
          from: "*"
          to: "feedback_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      card_state: "new" | "learning" | "young" | "mature" | "relearn"
      feedback_status: "new" | "accepted" | "rejected" | "in-progress" | "done"
      feedback_type: "idea" | "bug" | "other"
      feedback_visibility: "public" | "internal"
      media_slot: "card_front" | "card_back"
      member_role: "user" | "moderator" | "admin"
      shop_category: "power_ups" | "stationary"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      card_state: ["new", "learning", "young", "mature", "relearn"],
      feedback_status: ["new", "accepted", "rejected", "in-progress", "done"],
      feedback_type: ["idea", "bug", "other"],
      feedback_visibility: ["public", "internal"],
      media_slot: ["card_front", "card_back"],
      member_role: ["user", "moderator", "admin"],
      shop_category: ["power_ups", "stationary"],
    },
  },
} as const

