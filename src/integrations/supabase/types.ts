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
      authors: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          credentials: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          credentials?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          credentials?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author_id: string
          class_level: string
          created_at: string
          id: string
          status: string
          subject: string
          term: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          class_level: string
          created_at?: string
          id?: string
          status?: string
          subject: string
          term: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          class_level?: string
          created_at?: string
          id?: string
          status?: string
          subject?: string
          term?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      glossary_terms: {
        Row: {
          author_id: string
          book_id: string
          created_at: string
          definition: string
          id: string
          source_week_id: string | null
          term: string
          updated_at: string
        }
        Insert: {
          author_id: string
          book_id: string
          created_at?: string
          definition?: string
          id?: string
          source_week_id?: string | null
          term: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_id?: string
          created_at?: string
          definition?: string
          id?: string
          source_week_id?: string | null
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "glossary_terms_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "glossary_terms_source_week_id_fkey"
            columns: ["source_week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          author_id: string
          book_id: string
          created_at: string
          id: string
          mime_type: string | null
          ocr_confidence: number | null
          ocr_status: string
          ocr_text: string | null
          page_order: number
          storage_path: string
        }
        Insert: {
          author_id: string
          book_id: string
          created_at?: string
          id?: string
          mime_type?: string | null
          ocr_confidence?: number | null
          ocr_status?: string
          ocr_text?: string | null
          page_order?: number
          storage_path: string
        }
        Update: {
          author_id?: string
          book_id?: string
          created_at?: string
          id?: string
          mime_type?: string | null
          ocr_confidence?: number | null
          ocr_status?: string
          ocr_text?: string | null
          page_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          activities: string[]
          author_id: string
          body_markdown: string
          book_id: string
          created_at: string
          heading: string
          id: string
          objectives: string[]
          order_index: number
          updated_at: string
          week_id: string
        }
        Insert: {
          activities?: string[]
          author_id: string
          body_markdown?: string
          book_id: string
          created_at?: string
          heading?: string
          id?: string
          objectives?: string[]
          order_index?: number
          updated_at?: string
          week_id: string
        }
        Update: {
          activities?: string[]
          author_id?: string
          body_markdown?: string
          book_id?: string
          created_at?: string
          heading?: string
          id?: string
          objectives?: string[]
          order_index?: number
          updated_at?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          author_id: string
          book_id: string
          created_at: string
          id: string
          order_index: number
          overview: string
          title: string
          updated_at: string
          week_number: number
        }
        Insert: {
          author_id: string
          book_id: string
          created_at?: string
          id?: string
          order_index?: number
          overview?: string
          title?: string
          updated_at?: string
          week_number: number
        }
        Update: {
          author_id?: string
          book_id?: string
          created_at?: string
          id?: string
          order_index?: number
          overview?: string
          title?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weeks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
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
