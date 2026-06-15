export type CampaignStatus =
  | "queued"
  | "writing"
  | "generating"
  | "composing"
  | "done"
  | "failed";

export interface Campaign {
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
}

export interface CreativeLayout {
  template: string;
  headline: string;
  price: string;
  promo: string;
  logoUrl: string | null;
  palette: string[] | null;
}

export interface Creative {
  id: string;
  campaign_id: string;
  variant_index: number;
  background_url: string | null;
  final_url: string | null;
  layout: CreativeLayout | null;
  created_at: string;
}

export interface CampaignWithCreatives {
  campaign: Campaign;
  creatives: Creative[];
}
