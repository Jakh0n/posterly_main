export interface Brand {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  palette: string[] | null;
  tone: string | null;
  source_url: string | null;
  created_at: string;
}

export interface BrandExtraction {
  name: string;
  palette: string[];
  tone: string;
  logo_candidate_url: string | null;
}

export interface BrandFormValues {
  name: string;
  tone: string;
  palette: string[];
  logoUrl: string | null;
  sourceUrl: string | null;
}
