/**
 * Database types for Posterly's Supabase Postgres schema.
 *
 * Kept in sync with `supabase/migrations`. The shape mirrors the output of
 * `supabase gen types typescript` so it plugs directly into
 * `createClient<Database>()`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CampaignStatus =
  | "queued"
  | "writing"
  | "generating"
  | "composing"
  | "done"
  | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          plan: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          plan?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          plan?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          logo_url: string | null;
          palette: Json | null;
          tone: string | null;
          source_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          logo_url?: string | null;
          palette?: Json | null;
          tone?: string | null;
          source_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          logo_url?: string | null;
          palette?: Json | null;
          tone?: string | null;
          source_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          brand_id: string | null;
          product_name: string;
          price: string | null;
          promo: string | null;
          product_image_url: string | null;
          status: CampaignStatus;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          brand_id?: string | null;
          product_name: string;
          price?: string | null;
          promo?: string | null;
          product_image_url?: string | null;
          status?: CampaignStatus;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          brand_id?: string | null;
          product_name?: string;
          price?: string | null;
          promo?: string | null;
          product_image_url?: string | null;
          status?: CampaignStatus;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      creatives: {
        Row: {
          id: string;
          campaign_id: string;
          variant_index: number;
          background_url: string | null;
          final_url: string | null;
          layout: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          variant_index?: number;
          background_url?: string | null;
          final_url?: string | null;
          layout?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          variant_index?: number;
          background_url?: string | null;
          final_url?: string | null;
          layout?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          delta: number;
          reason: string;
          ref_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          delta: number;
          reason: string;
          ref_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          delta?: number;
          reason?: string;
          ref_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          polar_subscription_id: string | null;
          status: string | null;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          polar_subscription_id?: string | null;
          status?: string | null;
          current_period_end?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          polar_subscription_id?: string | null;
          status?: string | null;
          current_period_end?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_credit_balance: {
        Args: { p_user_id: string };
        Returns: number;
      };
      spend_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reason: string;
          p_ref_id?: string | null;
        };
        Returns: number;
      };
      refund_credits: {
        Args: {
          p_user_id: string;
          p_ref_id: string;
        };
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type Brand = Tables<"brands">;
export type Campaign = Tables<"campaigns">;
export type Creative = Tables<"creatives">;
export type CreditTransaction = Tables<"credit_transactions">;
export type Subscription = Tables<"subscriptions">;
