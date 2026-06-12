export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
            foreignKeyName: 'cards_deck_id_fkey'
            columns: ['deck_id']
            isOneToOne: false
            referencedRelation: 'decks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cards_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
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
          study_config?: Json | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'decks_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
        ]
      }
      lessons: {
        Row: {
          audio_path: string
          created_at: string
          id: number
          lang: string | null
          member_id: string
          title: string
          transcript: Json
          updated_at: string
        }
        Insert: {
          audio_path: string
          created_at?: string
          id?: number
          lang?: string | null
          member_id: string
          title: string
          transcript?: Json
          updated_at?: string
        }
        Update: {
          audio_path?: string
          created_at?: string
          id?: number
          lang?: string | null
          member_id?: string
          title?: string
          transcript?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lessons_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
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
          slot: Database['public']['Enums']['media_slot'] | null
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
          slot?: Database['public']['Enums']['media_slot'] | null
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
          slot?: Database['public']['Enums']['media_slot'] | null
        }
        Relationships: [
          {
            foreignKeyName: 'media_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards_with_images'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_deck_id_fkey'
            columns: ['deck_id']
            isOneToOne: false
            referencedRelation: 'decks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_lesson_id_fkey'
            columns: ['lesson_id']
            isOneToOne: false
            referencedRelation: 'lessons'
            referencedColumns: ['id']
          }
        ]
      }
      members: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          display_name: string
          email: string | null
          id: string
          plan: string
          preferences: Json
          role: Database['public']['Enums']['member_role']
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          email?: string | null
          id: string
          plan?: string
          preferences?: Json
          role?: Database['public']['Enums']['member_role']
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          email?: string | null
          id?: string
          plan?: string
          preferences?: Json
          role?: Database['public']['Enums']['member_role']
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'members_plan_fkey'
            columns: ['plan']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          }
        ]
      }
      plans: {
        Row: {
          cards_per_deck_limit: number | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          stripe_price_id: string | null
        }
        Insert: {
          cards_per_deck_limit?: number | null
          created_at?: string
          display_name: string
          id: string
          is_active?: boolean
          stripe_price_id?: string | null
        }
        Update: {
          cards_per_deck_limit?: number | null
          created_at?: string
          display_name?: string
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
            foreignKeyName: 'purchases_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'shop_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchases_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
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
            foreignKeyName: 'review_logs_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'review_logs_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards_with_images'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'review_logs_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
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
            foreignKeyName: 'reviews_card_id_fkey'
            columns: ['card_id']
            isOneToOne: true
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_card_id_fkey'
            columns: ['card_id']
            isOneToOne: true
            referencedRelation: 'cards_with_images'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
        ]
      }
      shop_items: {
        Row: {
          category: Database['public']['Enums']['shop_category'] | null
          description: string | null
          id: number
          item_key: string | null
          name: string | null
          price: number | null
        }
        Insert: {
          category?: Database['public']['Enums']['shop_category'] | null
          description?: string | null
          id?: number
          item_key?: string | null
          name?: string | null
          price?: number | null
        }
        Update: {
          category?: Database['public']['Enums']['shop_category'] | null
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
            foreignKeyName: 'cards_deck_id_fkey'
            columns: ['deck_id']
            isOneToOne: false
            referencedRelation: 'decks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cards_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          }
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
        Returns: Database['public']['Enums']['member_role']
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
          from: '*'
          to: 'cards'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      card_rank_between: {
        Args: {
          p_deck_id: number
          p_left_card_id: number
          p_right_card_id: number
        }
        Returns: number
      }
      create_lesson: {
        Args: {
          p_audio_path: string
          p_lang?: string
          p_title: string
          p_transcript: Json
        }
        Returns: {
          audio_path: string
          created_at: string
          id: number
          lang: string | null
          member_id: string
          title: string
          transcript: Json
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'lessons'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decks_with_stats: {
        Args: { p_today_start: string }
        Returns: {
          card_attributes: Json
          card_count: number
          cover_config: Json
          created_at: string
          description: string
          due_count: number
          has_image: boolean
          id: number
          is_public: boolean
          member_display_name: string
          member_id: string
          new_reviewed_today_count: number
          reviewed_today_count: number
          study_config: Json
          tags: string[]
          title: string
          updated_at: string
        }[]
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
      get_member_card_count: {
        Args: {
          p_member_id: string
          p_now?: string
          p_only_due_cards?: boolean
        }
        Returns: number
      }
      get_member_card_index: {
        Args: {
          p_member_id: string
        }
        Returns: {
          deck_ids: number[]
          term: string
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
          from: '*'
          to: 'cards_with_images'
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
          p_side: string
        }
        Returns: {
          id: number
          rank: number
        }[]
      }
      invoke_cleanup_media: { Args: never; Returns: undefined }
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
      reindex_deck_ranks: { Args: { p_deck_id: number }; Returns: undefined }
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
      save_review:
        | {
            Args: {
              p_card_id: number
              p_card_state: number
              p_difficulty: number
              p_due: string
              p_elapsed_days: number
              p_lapses: number
              p_last_review: string
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
        | {
            Args: {
              p_card_id: number
              p_difficulty: number
              p_due: string
              p_elapsed_days: number
              p_lapses: number
              p_last_review: string
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
    }
    Enums: {
      card_state: 'new' | 'learning' | 'young' | 'mature' | 'relearn'
      media_slot: 'card_front' | 'card_back'
      member_role: 'user' | 'moderator' | 'admin'
      shop_category: 'power_ups' | 'stationary'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {}
  },
  public: {
    Enums: {
      card_state: ['new', 'learning', 'young', 'mature', 'relearn'],
      media_slot: ['card_front', 'card_back'],
      member_role: ['user', 'moderator', 'admin'],
      shop_category: ['power_ups', 'stationary']
    }
  }
} as const
