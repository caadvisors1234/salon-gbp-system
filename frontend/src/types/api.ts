// Centralized API response types — mirrors backend Pydantic schemas.

// --- Auth / User ---
export interface MeResponse {
  id: string;
  supabase_user_id: string;
  email: string;
  role: string;
  salon_id: string | null;
}

// --- Posts ---
export interface PostListItem {
  id: string;
  salon_id: string;
  gbp_location_id: string;
  source_content_id: string;
  post_type: string;
  status: string;
  summary_final: string;
  cta_url: string | null;
  image_asset_id: string | null;
  error_message: string | null;
  created_at: string;
  posted_at: string | null;
}

export interface PostDetail extends PostListItem {
  summary_generated: string;
  cta_type: string | null;
  offer_redeem_online_url: string | null;
  event_title: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  gbp_post_id: string | null;
  edited_by: string | null;
  edited_at: string | null;
}

// --- Media ---
export interface MediaUploadListItem {
  id: string;
  salon_id: string;
  gbp_location_id: string;
  source_content_id: string;
  media_asset_id: string;
  media_format: string;
  category: string;
  status: string;
  source_image_url: string;
  error_message: string | null;
  created_at: string;
  uploaded_at: string | null;
}

// --- Alerts ---
export interface AlertResponse {
  id: string;
  salon_id: string | null;
  severity: string;
  alert_type: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  acked_by: string | null;
  acked_at: string | null;
  created_at: string;
}

// --- Salon ---
export interface SalonResponse {
  id: string;
  name: string;
  slug: string;
  hotpepper_salon_id: string | null;
  hotpepper_blog_url: string | null;
  hotpepper_style_url: string | null;
  hotpepper_coupon_url: string | null;
  is_active: boolean;
  hotpepper_top_url: string | null;
}

// --- GBP ---
export interface GbpConnectionResponse {
  id: string;
  salon_id: string;
  google_account_email: string;
  token_expires_at: string;
  status: string;
}

export interface GbpLocationResponse {
  id: string;
  salon_id: string;
  gbp_connection_id: string;
  account_id: string;
  location_id: string;
  location_name: string | null;
  is_active: boolean;
}

export interface GbpAvailableLocation {
  account_id: string;
  location_id: string;
  location_name: string | null;
}

// --- Instagram ---
export interface InstagramAccountResponse {
  id: string;
  salon_id: string;
  ig_user_id: string;
  ig_username: string;
  account_type: string;
  staff_name: string | null;
  token_expires_at: string;
  is_active: boolean;
  sync_hashtags: boolean;
}

// --- Admin ---
export interface AppUserResponse {
  id: string;
  salon_id: string | null;
  supabase_user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
}

// --- Job Logs ---
export interface JobLogResponse {
  id: string;
  salon_id: string | null;
  job_type: string;
  status: string;
  items_found: number;
  items_processed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

// --- Monitor ---
export interface SalonMonitorItem {
  salon_id: string;
  slug: string;
  name: string;
  is_active: boolean;
  open_alerts: number;
  gbp_connection_status: string;
  active_locations: number;
}
