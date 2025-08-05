export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      conversation_messages: {
        Row: {
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_user_message: boolean
          referenced_stories: string[] | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_user_message: boolean
          referenced_stories?: string[] | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_user_message?: boolean
          referenced_stories?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          persona_id: string
          started_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          persona_id: string
          started_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          persona_id?: string
          started_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          bio: string | null
          birth_date: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          relationship: Database["public"]["Enums"]["relationship_type"] | null
          updated_at: string
          user_id: string
          voice_settings: Json | null
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          relationship?: Database["public"]["Enums"]["relationship_type"] | null
          updated_at?: string
          user_id: string
          voice_settings?: Json | null
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          relationship?: Database["public"]["Enums"]["relationship_type"] | null
          updated_at?: string
          user_id?: string
          voice_settings?: Json | null
        }
        Relationships: []
      }
      personas: {
        Row: {
          conversation_style: Json | null
          created_at: string
          elevenlabs_agent_id: string | null
          family_member_id: string
          id: string
          is_active: boolean | null
          knowledge_base: string | null
          personality_traits: Json | null
          training_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          updated_at: string
          user_id: string
          voice_model_id: string | null
          voice_model_status: string | null
          voice_samples_count: number | null
        }
        Insert: {
          conversation_style?: Json | null
          created_at?: string
          elevenlabs_agent_id?: string | null
          family_member_id: string
          id?: string
          is_active?: boolean | null
          knowledge_base?: string | null
          personality_traits?: Json | null
          training_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          updated_at?: string
          user_id: string
          voice_model_id?: string | null
          voice_model_status?: string | null
          voice_samples_count?: number | null
        }
        Update: {
          conversation_style?: Json | null
          created_at?: string
          elevenlabs_agent_id?: string | null
          family_member_id?: string
          id?: string
          is_active?: boolean | null
          knowledge_base?: string | null
          personality_traits?: Json | null
          training_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          updated_at?: string
          user_id?: string
          voice_model_id?: string | null
          voice_model_status?: string | null
          voice_samples_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          audio_url: string
          context: string | null
          created_at: string
          duration_seconds: number | null
          family_member_id: string
          file_size_bytes: number | null
          id: string
          processing_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          session_date: string
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url: string
          context?: string | null
          created_at?: string
          duration_seconds?: number | null
          family_member_id: string
          file_size_bytes?: number | null
          id?: string
          processing_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          session_date?: string
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string
          context?: string | null
          created_at?: string
          duration_seconds?: number | null
          family_member_id?: string
          file_size_bytes?: number | null
          id?: string
          processing_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          session_date?: string
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          category: Database["public"]["Enums"]["story_category"] | null
          content: string
          created_at: string
          emotional_tone: string | null
          end_timestamp: number | null
          family_member_id: string
          id: string
          keywords: string[] | null
          recording_id: string
          start_timestamp: number | null
          themes: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["story_category"] | null
          content: string
          created_at?: string
          emotional_tone?: string | null
          end_timestamp?: number | null
          family_member_id: string
          id?: string
          keywords?: string[] | null
          recording_id: string
          start_timestamp?: number | null
          themes?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["story_category"] | null
          content?: string
          created_at?: string
          emotional_tone?: string | null
          end_timestamp?: number | null
          family_member_id?: string
          id?: string
          keywords?: string[] | null
          recording_id?: string
          start_timestamp?: number | null
          themes?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_samples: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          is_used_for_training: boolean | null
          persona_id: string
          quality_score: number | null
          recording_id: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_used_for_training?: boolean | null
          persona_id: string
          quality_score?: number | null
          recording_id: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_used_for_training?: boolean | null
          persona_id?: string
          quality_score?: number | null
          recording_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_samples_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_samples_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      processing_status: "pending" | "processing" | "completed" | "failed"
      relationship_type:
        | "parent"
        | "grandparent"
        | "sibling"
        | "aunt_uncle"
        | "cousin"
        | "child"
        | "grandchild"
        | "spouse"
        | "friend"
        | "other"
      story_category:
        | "childhood"
        | "career"
        | "family"
        | "wisdom"
        | "historical"
        | "hobbies"
        | "travel"
        | "achievements"
        | "challenges"
        | "relationships"
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
      processing_status: ["pending", "processing", "completed", "failed"],
      relationship_type: [
        "parent",
        "grandparent",
        "sibling",
        "aunt_uncle",
        "cousin",
        "child",
        "grandchild",
        "spouse",
        "friend",
        "other",
      ],
      story_category: [
        "childhood",
        "career",
        "family",
        "wisdom",
        "historical",
        "hobbies",
        "travel",
        "achievements",
        "challenges",
        "relationships",
      ],
    },
  },
} as const
