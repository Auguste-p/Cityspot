import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type IssueStatus = 'open' | 'in-progress' | 'resolved';

export interface Database {
  public: {
    Tables: {
      issues: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          location: Json;
          image_url: string | null;
          is_private_property: boolean | null;
          is_own_property: boolean | null;
          owner_email: string | null;
          positive_votes: number | null;
          negative_votes: number | null;
          created_at: string | null;
          status: IssueStatus | null;
          is_municipal_project: boolean | null;
          category: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          location: Json;
          image_url?: string | null;
          is_private_property?: boolean | null;
          is_own_property?: boolean | null;
          owner_email?: string | null;
          positive_votes?: number | null;
          negative_votes?: number | null;
          created_at?: string | null;
          status?: IssueStatus | null;
          is_municipal_project?: boolean | null;
          category?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          location?: Json;
          image_url?: string | null;
          is_private_property?: boolean | null;
          is_own_property?: boolean | null;
          owner_email?: string | null;
          positive_votes?: number | null;
          negative_votes?: number | null;
          created_at?: string | null;
          status?: IssueStatus | null;
          is_municipal_project?: boolean | null;
          category?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          issue_id: string;
          title: string;
          completed: boolean | null;
        };
        Insert: {
          id?: string;
          issue_id: string;
          title: string;
          completed?: boolean | null;
        };
        Update: {
          id?: string;
          issue_id?: string;
          title?: string;
          completed?: boolean | null;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          id: number;
          issue_id: string;
          name: string;
        };
        Insert: {
          id?: number;
          issue_id: string;
          name: string;
        };
        Update: {
          id?: number;
          issue_id?: string;
          name?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          created_at: string;
          id_user: string;
          id_issue: string;
          comment: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          id_user: string;
          id_issue: string;
          comment: string;
        };
        Update: {
          id?: string;
          comment?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: { id: string; created_at: string; id_user: string; id_issue: string; yes: boolean; };
        Insert: { id?: string; created_at?: string; id_user: string; id_issue: string; yes: boolean; };
        Update: { id?: string; yes: boolean; };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          name: string | null;
          city: string | null;
          cityLat: number | null;
          cityLng: number | null;
          role: string;
          phone: string | null;
          address: string | null;
          avatar: string | null;
          emailNotifications: boolean;
          profileVisible: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          city?: string | null;
          cityLat?: number | null;
          cityLng?: number | null;
          role?: string;
          phone?: string | null;
          address?: string | null;
          avatar?: string | null;
          emailNotifications?: boolean;
          profileVisible?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          city?: string | null;
          cityLat?: number | null;
          cityLng?: number | null;
          role?: string;
          phone?: string | null;
          address?: string | null;
          avatar?: string | null;
          emailNotifications?: boolean;
          profileVisible?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      email_exists: {
        Args: { check_email: string };
        Returns: boolean;
      };
    };
  };
}

let supabaseClient: SupabaseClient<Database> | null = null;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isSecretKey(value?: string) {
  return Boolean(value && value.startsWith('sb_secret_'));
}

export const hasSupabaseConfig = Boolean(
  supabaseUrl && supabaseAnonKey && !isSecretKey(supabaseAnonKey),
);

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (isSecretKey(supabaseAnonKey)) {
      console.warn(
        'Supabase browser client disabled: use VITE_SUPABASE_ANON_KEY, not a secret/service role key.',
      );

    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}