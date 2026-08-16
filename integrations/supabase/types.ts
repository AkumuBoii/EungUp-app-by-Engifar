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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      battle_bets: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          meme_id: string
          settled: boolean
          user_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          meme_id: string
          settled?: boolean
          user_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          meme_id?: string
          settled?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_bets_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_bets_meme_id_fkey"
            columns: ["meme_id"]
            isOneToOne: false
            referencedRelation: "memes"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_results: {
        Row: {
          battle_id: string
          distractions: number
          duration_sec: number
          id: string
          max_score: number
          score: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          battle_id: string
          distractions?: number
          duration_sec?: number
          id?: string
          max_score?: number
          score?: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          battle_id?: string
          distractions?: number
          duration_sec?: number
          id?: string
          max_score?: number
          score?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_results_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_tasks: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_tasks_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          challenger_id: string
          challenger_sec: number
          class_id: string
          created_at: string
          ends_at: string | null
          id: string
          mode: string
          opponent_id: string
          opponent_sec: number
          quiz_size: number
          stake_worms: number
          started_at: string | null
          status: string
          subject_id: string | null
          target_sec: number
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          challenger_sec?: number
          class_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          mode?: string
          opponent_id: string
          opponent_sec?: number
          quiz_size?: number
          stake_worms?: number
          started_at?: string | null
          status?: string
          subject_id?: string | null
          target_sec?: number
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          challenger_sec?: number
          class_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          mode?: string
          opponent_id?: string
          opponent_sec?: number
          quiz_size?: number
          stake_worms?: number
          started_at?: string | null
          status?: string
          subject_id?: string | null
          target_sec?: number
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          class_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          class_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          invite_code: string
          join_code: string
          name: string
          owner_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code: string
          join_code?: string
          name: string
          owner_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          join_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stats: {
        Row: {
          day: string
          goal_met: boolean
          goal_sec: number
          total_sec: number
          user_id: string
        }
        Insert: {
          day: string
          goal_met?: boolean
          goal_sec?: number
          total_sec?: number
          user_id: string
        }
        Update: {
          day?: string
          goal_met?: boolean
          goal_sec?: number
          total_sec?: number
          user_id?: string
        }
        Relationships: []
      }
      gacha_items: {
        Row: {
          active: boolean
          category: string
          description: string | null
          id: string
          kind: string
          name: string
          payload: Json
          price_worms: number
          rarity: Database["public"]["Enums"]["meme_rarity"]
          slug: string
          weight: number
        }
        Insert: {
          active?: boolean
          category?: string
          description?: string | null
          id?: string
          kind: string
          name: string
          payload?: Json
          price_worms: number
          rarity?: Database["public"]["Enums"]["meme_rarity"]
          slug: string
          weight?: number
        }
        Update: {
          active?: boolean
          category?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          payload?: Json
          price_worms?: number
          rarity?: Database["public"]["Enums"]["meme_rarity"]
          slug?: string
          weight?: number
        }
        Relationships: []
      }
      gacha_pulls: {
        Row: {
          category: string
          created_at: string
          id: string
          item_id: string | null
          meme_id: string | null
          name: string
          pity_hit: boolean
          rarity: Database["public"]["Enums"]["meme_rarity"]
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          item_id?: string | null
          meme_id?: string | null
          name: string
          pity_hit?: boolean
          rarity?: Database["public"]["Enums"]["meme_rarity"]
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          item_id?: string | null
          meme_id?: string | null
          name?: string
          pity_hit?: boolean
          rarity?: Database["public"]["Enums"]["meme_rarity"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gacha_pulls_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "gacha_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gacha_pulls_meme_id_fkey"
            columns: ["meme_id"]
            isOneToOne: false
            referencedRelation: "memes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          active_until: string | null
          equipped: boolean
          id: string
          item_id: string
          qty: number
          user_id: string
        }
        Insert: {
          active_until?: string | null
          equipped?: boolean
          id?: string
          item_id: string
          qty?: number
          user_id: string
        }
        Update: {
          active_until?: string | null
          equipped?: boolean
          id?: string
          item_id?: string
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_gacha_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "gacha_items"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          captured_at: string
          id: string
          period: string
          rank: number
          scope: string
          user_id: string
          value: number
        }
        Insert: {
          captured_at?: string
          id?: string
          period: string
          rank: number
          scope: string
          user_id: string
          value: number
        }
        Update: {
          captured_at?: string
          id?: string
          period?: string
          rank?: number
          scope?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      memes: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string | null
          rarity: Database["public"]["Enums"]["meme_rarity"]
          slug: string
          title: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          rarity?: Database["public"]["Enums"]["meme_rarity"]
          slug: string
          title: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          rarity?: Database["public"]["Enums"]["meme_rarity"]
          slug?: string
          title?: string
        }
        Relationships: []
      }
      pokes: {
        Row: {
          created_at: string
          from_user: string
          id: string
          meme_id: string | null
          message: string | null
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          meme_id?: string | null
          message?: string | null
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          meme_id?: string | null
          message?: string | null
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "pokes_meme_id_fkey"
            columns: ["meme_id"]
            isOneToOne: false
            referencedRelation: "memes"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string | null
          class_id: string | null
          created_at: string
          id: string
          payload: Json
          type: Database["public"]["Enums"]["post_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          type?: Database["public"]["Enums"]["post_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          type?: Database["public"]["Enums"]["post_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_goal_min: number
          display_name: string | null
          id: string
          level: number
          mascot_skin: string
          onboarded: boolean
          pity_epic: number
          pity_legendary: number
          timezone: string
          total_rolls: number
          updated_at: string
          username: string | null
          worms: number
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_min?: number
          display_name?: string | null
          id: string
          level?: number
          mascot_skin?: string
          onboarded?: boolean
          pity_epic?: number
          pity_legendary?: number
          timezone?: string
          total_rolls?: number
          updated_at?: string
          username?: string | null
          worms?: number
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_min?: number
          display_name?: string | null
          id?: string
          level?: number
          mascot_skin?: string
          onboarded?: boolean
          pity_epic?: number
          pity_legendary?: number
          timezone?: string
          total_rolls?: number
          updated_at?: string
          username?: string | null
          worms?: number
          xp?: number
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          current: number
          freezes_left: number
          last_active_day: string | null
          longest: number
          user_id: string
        }
        Insert: {
          current?: number
          freezes_left?: number
          last_active_day?: string | null
          longest?: number
          user_id: string
        }
        Update: {
          current?: number
          freezes_left?: number
          last_active_day?: string | null
          longest?: number
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_sec: number
          ended_at: string | null
          id: string
          mode: Database["public"]["Enums"]["study_mode"]
          started_at: string
          strikes: number
          subject_id: string | null
          target_sec: number | null
          task_id: string | null
          user_id: string
          verified: boolean
          worms_awarded: number
          xp_awarded: number
        }
        Insert: {
          created_at?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["study_mode"]
          started_at?: string
          strikes?: number
          subject_id?: string | null
          target_sec?: number | null
          task_id?: string | null
          user_id: string
          verified?: boolean
          worms_awarded?: number
          xp_awarded?: number
        }
        Update: {
          created_at?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["study_mode"]
          started_at?: string
          strikes?: number
          subject_id?: string | null
          target_sec?: number | null
          task_id?: string | null
          user_id?: string
          verified?: boolean
          worms_awarded?: number
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_stats: {
        Row: {
          sessions: number
          subject_id: string
          total_sec: number
          user_id: string
        }
        Insert: {
          sessions?: number
          subject_id: string
          total_sec?: number
          user_id: string
        }
        Update: {
          sessions?: number
          subject_id?: string
          total_sec?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_stats_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string | null
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          created_at: string
          filename: string
          id: string
          kind: string
          storage_path: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          kind?: string
          storage_path: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          kind?: string
          storage_path?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          class_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          delta_worms: number
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta_worms: number
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta_worms?: number
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_memes: {
        Row: {
          id: string
          meme_id: string
          obtained_at: string
          source: string
          user_id: string
        }
        Insert: {
          id?: string
          meme_id: string
          obtained_at?: string
          source?: string
          user_id: string
        }
        Update: {
          id?: string
          meme_id?: string
          obtained_at?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memes_meme_id_fkey"
            columns: ["meme_id"]
            isOneToOne: false
            referencedRelation: "memes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_battle_participant: {
        Args: { _battle_id: string; _user_id: string }
        Returns: boolean
      }
      is_class_member: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      meme_rarity: "common" | "rare" | "epic" | "legendary"
      post_type:
        | "session"
        | "milestone"
        | "task_done"
        | "shame"
        | "help"
        | "battle"
        | "leaderboard"
        | "system"
      study_mode: "stopwatch" | "countdown" | "task_focus"
      task_status: "todo" | "in_progress" | "submitted" | "done"
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
      app_role: ["admin", "moderator", "user"],
      meme_rarity: ["common", "rare", "epic", "legendary"],
      post_type: [
        "session",
        "milestone",
        "task_done",
        "shame",
        "help",
        "battle",
        "leaderboard",
        "system",
      ],
      study_mode: ["stopwatch", "countdown", "task_focus"],
      task_status: ["todo", "in_progress", "submitted", "done"],
    },
  },
} as const
