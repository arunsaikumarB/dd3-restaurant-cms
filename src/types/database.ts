/**
 * PostgreSQL table types for Desi Dhamaka Supabase schema.
 * Keep in sync with supabase/migrations/*.sql
 */

export type ContentStatus = "active" | "inactive" | "draft";
export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type UserRole = "admin" | "staff";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends Timestamps {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

export interface RestaurantSettings extends Timestamps {
  id: string;
  location_id: RestaurantLocationId;
  restaurant_name: string;
  phone: string | null;
  phones: Json | null;
  email: string | null;
  address: string | null;
  google_maps: string | null;
  opening_hours: Json | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  logo: string | null;
  favicon: string | null;
  reservation_url: string | null;
  order_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
}

export interface HomepageContent extends Timestamps {
  id: string;
  location_id: RestaurantLocationId;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image: string | null;
  hero_video: string | null;
  primary_cta_label: string | null;
  primary_cta_url: string | null;
  secondary_cta_label: string | null;
  secondary_cta_url: string | null;
  about_title: string | null;
  about_description: string | null;
}

export interface PageContent {
  id: string;
  location_id: RestaurantLocationId;
  page: string;
  section: string;
  content: Json;
  updated_at: string;
}

export type RestaurantLocationId = "south-plainfield" | "oak-tree" | "lawrenceville";

export interface MenuCategory extends Timestamps {
  id: string;
  location_id: RestaurantLocationId;
  name: string;
  slug: string;
  image: string | null;
  display_order: number;
  status: ContentStatus;
  chefgaa_category_id: string | null;
  chefgaa_content_hash: string | null;
  imported_from_chefgaa: boolean;
  chefgaa_last_synced_at: string | null;
  chefgaa_removed_at: string | null;
}

export interface MenuItem extends Timestamps {
  id: string;
  location_id: RestaurantLocationId;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  veg: boolean;
  popular: boolean;
  chef_special: boolean;
  spice_level: number | null;
  status: ContentStatus;
  display_order: number;
  chefgaa_outlet_item_id: string | null;
  chefgaa_catalog_item_id: string | null;
  chefgaa_content_hash: string | null;
  imported_from_chefgaa: boolean;
  chefgaa_last_synced_at: string | null;
  manual_override: boolean;
  chefgaa_removed_at: string | null;
}

export interface ChefGaaLocationConfig extends Timestamps {
  location_id: RestaurantLocationId;
  api_version: "legacy" | "v2";
  legacy_outlet_id: number | null;
  legacy_partner_id: number;
  legacy_order_type_id: number | null;
  v2_tenant_id: string | null;
  v2_store_id: string | null;
  v2_platform_slug: string | null;
  sync_enabled: boolean;
  sync_schedule: "manual" | "15m" | "hourly" | "daily";
  manual_override_mode: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_duration_ms: number | null;
  last_sync_error: string | null;
  catalog_revision: number;
  consecutive_failures: number;
  api_health_status: "unknown" | "healthy" | "warning" | "offline" | "critical";
  critical_alert: boolean;
  last_health_check_at: string | null;
  chefgaa_initialized: boolean;
  chefgaa_catalog_category_count: number | null;
  chefgaa_catalog_item_count: number | null;
}

export interface ChefGaaSyncRun {
  id: string;
  location_id: RestaurantLocationId | string;
  trigger: "manual" | "scheduled" | "retry";
  status: "running" | "success" | "partial" | "failed";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  categories_created: number;
  categories_updated: number;
  categories_deactivated: number;
  items_created: number;
  items_updated: number;
  items_deactivated: number;
  prices_changed: number;
  items_failed: number;
  error_summary: string | null;
  metadata: Json;
}

export interface ChefGaaSyncRunEvent {
  id: string;
  run_id: string;
  level: "info" | "warn" | "error";
  message: string;
  context: Json | null;
  created_at: string;
}

export interface ChefGaaSyncLock {
  id: number;
  locked: boolean;
  lock_holder: string | null;
  locked_at: string | null;
  expires_at: string | null;
}

export interface ChefGaaSyncQueueJob {
  id: string;
  location_id: string | null;
  trigger: "manual" | "scheduled" | "retry";
  requested_by: string | null;
  status: "pending" | "processing" | "completed" | "skipped";
  created_at: string;
  processed_at: string | null;
  result_message: string | null;
}

export interface ChefGaaSyncNotification {
  id: string;
  event_type: string;
  location_id: string | null;
  message: string;
  severity: "info" | "success" | "warning" | "error" | "critical";
  metadata: Json;
  created_at: string;
}

export interface ChefGaaApiHealthCheck {
  id: string;
  location_id: string;
  status: "healthy" | "warning" | "offline";
  response_time_ms: number | null;
  auth_ok: boolean | null;
  data_received: boolean | null;
  error_message: string | null;
  checked_at: string;
}

export interface Offer extends Timestamps {
  id: string;
  location_id: RestaurantLocationId;
  slug: string | null;
  title: string;
  description: string | null;
  image: string | null;
  gallery: Json;
  badge: string | null;
  category: string | null;
  price: string | null;
  valid_until: string | null;
  featured: boolean;
  terms: Json;
  content: Json;
  display_order: number;
  order_category: string | null;
  active: boolean;
  /** Legacy columns kept for backward compatibility */
  banner: string | null;
  discount: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface GalleryImage extends Timestamps {
  id: string;
  image: string;
  category: string | null;
  alt_text: string | null;
  title: string | null;
  caption: string | null;
  featured: boolean;
  visible: boolean;
  display_order: number;
  section: string;
  location_id: string;
  page: string;
}

export type AnalyticsEventType =
  | "page_view"
  | "offer_view"
  | "offer_click"
  | "order_click"
  | "reservation_click";

export interface AnalyticsEvent {
  id: string;
  created_at: string;
  location_id: RestaurantLocationId;
  event_type: AnalyticsEventType;
  page_path: string;
  offer_id: string | null;
  offer_title: string | null;
  session_id: string;
  referrer: string | null;
  device: "mobile" | "tablet" | "desktop" | null;
  user_agent: string | null;
}

export type AnalyticsEventInsert = {
  location_id: RestaurantLocationId;
  event_type: AnalyticsEventType;
  page_path: string;
  offer_id?: string | null;
  offer_title?: string | null;
  session_id: string;
  referrer?: string | null;
  device?: "mobile" | "tablet" | "desktop" | null;
  user_agent?: string | null;
};

export interface Reservation extends Timestamps {
  id: string;
  location_id: RestaurantLocationId;
  customer_name: string;
  phone: string;
  email: string | null;
  date: string;
  time: string;
  guests: number;
  special_request: string | null;
  status: ReservationStatus;
}

export interface Review extends Timestamps {
  id: string;
  customer_name: string;
  rating: number;
  review: string;
  approved: boolean;
  featured: boolean;
}

/** Insert / update helpers (omit generated fields) */
export type UserProfileInsert = Omit<UserProfile, "created_at" | "updated_at"> &
  Partial<Pick<UserProfile, "created_at" | "updated_at">>;

export type RestaurantSettingsInsert = Omit<RestaurantSettings, "id" | "created_at" | "updated_at"> &
  Partial<Pick<RestaurantSettings, "id" | "created_at" | "updated_at">>;

export type HomepageContentInsert = Omit<HomepageContent, "id" | "created_at" | "updated_at"> &
  Partial<Pick<HomepageContent, "id" | "created_at" | "updated_at">>;

export type PageContentInsert = Omit<PageContent, "id" | "updated_at"> &
  Partial<Pick<PageContent, "id" | "updated_at">>;

export type MenuCategoryInsert = {
  id?: string;
  location_id: RestaurantLocationId;
  name: string;
  slug: string;
  image?: string | null;
  display_order?: number;
  status?: ContentStatus;
  chefgaa_category_id?: string | null;
  chefgaa_content_hash?: string | null;
  imported_from_chefgaa?: boolean;
  chefgaa_last_synced_at?: string | null;
  chefgaa_removed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MenuItemInsert = {
  id?: string;
  location_id: RestaurantLocationId;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  veg?: boolean;
  popular?: boolean;
  chef_special?: boolean;
  spice_level?: number | null;
  status?: ContentStatus;
  display_order?: number;
  chefgaa_outlet_item_id?: string | null;
  chefgaa_catalog_item_id?: string | null;
  chefgaa_content_hash?: string | null;
  imported_from_chefgaa?: boolean;
  chefgaa_last_synced_at?: string | null;
  manual_override?: boolean;
  chefgaa_removed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OfferInsert = Omit<Offer, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Offer, "id" | "created_at" | "updated_at">>;

export type GalleryImageInsert = Omit<GalleryImage, "id" | "created_at" | "updated_at"> &
  Partial<Pick<GalleryImage, "id" | "created_at" | "updated_at">>;

export type ReservationInsert = Omit<Reservation, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Reservation, "id" | "created_at" | "updated_at">>;

export type ReviewInsert = Omit<Review, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Review, "id" | "created_at" | "updated_at">>;

/** Supabase Database generic — used by createClient<Database>() */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: Partial<UserProfileInsert>;
        Relationships: [];
      };
      restaurant_settings: {
        Row: RestaurantSettings;
        Insert: RestaurantSettingsInsert;
        Update: Partial<RestaurantSettingsInsert>;
        Relationships: [];
      };
      homepage_content: {
        Row: HomepageContent;
        Insert: HomepageContentInsert;
        Update: Partial<HomepageContentInsert>;
        Relationships: [];
      };
      page_content: {
        Row: PageContent;
        Insert: PageContentInsert;
        Update: Partial<PageContentInsert>;
        Relationships: [];
      };
      menu_categories: {
        Row: MenuCategory;
        Insert: MenuCategoryInsert;
        Update: Partial<MenuCategoryInsert>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItem;
        Insert: MenuItemInsert;
        Update: Partial<MenuItemInsert>;
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: Offer;
        Insert: OfferInsert;
        Update: Partial<OfferInsert>;
        Relationships: [];
      };
      gallery: {
        Row: GalleryImage;
        Insert: GalleryImageInsert;
        Update: Partial<GalleryImageInsert>;
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEvent;
        Insert: AnalyticsEventInsert;
        Update: Partial<AnalyticsEventInsert>;
        Relationships: [];
      };
      reservations: {
        Row: Reservation;
        Insert: ReservationInsert;
        Update: Partial<ReservationInsert>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: ReviewInsert;
        Update: Partial<ReviewInsert>;
        Relationships: [];
      };
      chefgaa_location_config: {
        Row: ChefGaaLocationConfig;
        Insert: {
          location_id: RestaurantLocationId;
          api_version: "legacy" | "v2";
          legacy_outlet_id?: number | null;
          legacy_partner_id?: number;
          legacy_order_type_id?: number | null;
          v2_tenant_id?: string | null;
          v2_store_id?: string | null;
          v2_platform_slug?: string | null;
          sync_enabled?: boolean;
          sync_schedule?: ChefGaaLocationConfig["sync_schedule"];
          manual_override_mode?: boolean;
        };
        Update: Partial<ChefGaaLocationConfig>;
        Relationships: [];
      };
      chefgaa_sync_runs: {
        Row: ChefGaaSyncRun;
        Insert: {
          location_id: string;
          trigger: ChefGaaSyncRun["trigger"];
          status: ChefGaaSyncRun["status"];
          started_at?: string;
          finished_at?: string | null;
          duration_ms?: number | null;
          categories_created?: number;
          categories_updated?: number;
          categories_deactivated?: number;
          items_created?: number;
          items_updated?: number;
          items_deactivated?: number;
          prices_changed?: number;
          items_failed?: number;
          error_summary?: string | null;
          metadata?: Json;
        };
        Update: Partial<ChefGaaSyncRun>;
        Relationships: [];
      };
      chefgaa_sync_run_events: {
        Row: ChefGaaSyncRunEvent;
        Insert: {
          run_id: string;
          level: ChefGaaSyncRunEvent["level"];
          message: string;
          context?: Json | null;
        };
        Update: Partial<ChefGaaSyncRunEvent>;
        Relationships: [];
      };
      chefgaa_sync_lock: {
        Row: ChefGaaSyncLock;
        Insert: Partial<ChefGaaSyncLock>;
        Update: Partial<ChefGaaSyncLock>;
        Relationships: [];
      };
      chefgaa_sync_queue: {
        Row: ChefGaaSyncQueueJob;
        Insert: {
          location_id?: string | null;
          trigger: ChefGaaSyncQueueJob["trigger"];
          requested_by?: string | null;
          status?: ChefGaaSyncQueueJob["status"];
        };
        Update: Partial<ChefGaaSyncQueueJob>;
        Relationships: [];
      };
      chefgaa_sync_notifications: {
        Row: ChefGaaSyncNotification;
        Insert: {
          event_type: string;
          location_id?: string | null;
          message: string;
          severity?: ChefGaaSyncNotification["severity"];
          metadata?: Json;
        };
        Update: Partial<ChefGaaSyncNotification>;
        Relationships: [];
      };
      chefgaa_api_health_checks: {
        Row: ChefGaaApiHealthCheck;
        Insert: {
          location_id: string;
          status: ChefGaaApiHealthCheck["status"];
          response_time_ms?: number | null;
          auth_ok?: boolean | null;
          data_received?: boolean | null;
          error_message?: string | null;
        };
        Update: Partial<ChefGaaApiHealthCheck>;
        Relationships: [];
      };
      menu_items_legacy_archive: {
        Row: MenuItem & { archived_at: string; archive_reason: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      menu_categories_legacy_archive: {
        Row: MenuCategory & { archived_at: string; archive_reason: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      archive_legacy_menu_items: {
        Args: { p_location_id: string };
        Returns: number;
      };
      archive_legacy_menu_categories: {
        Args: { p_location_id: string };
        Returns: number;
      };
      analytics_summary: {
        Args: { p_location: string; p_from: string; p_to: string };
        Returns: {
          total_page_views: number;
          unique_sessions: number;
          offers_page_views: number;
          offer_clicks: number;
          order_clicks: number;
          reservation_clicks: number;
        };
      };
      analytics_views_by_day: {
        Args: { p_location: string; p_from: string; p_to: string };
        Returns: { day: string; views: number; sessions: number };
      };
      analytics_views_by_page: {
        Args: { p_location: string; p_from: string; p_to: string };
        Returns: { page_path: string; views: number };
      };
      analytics_offer_performance: {
        Args: { p_location: string; p_from: string; p_to: string };
        Returns: {
          offer_id: string;
          offer_title: string;
          is_active: boolean;
          views: number;
          clicks: number;
        };
      };
      analytics_offer_daily: {
        Args: { p_offer: string; p_location: string; p_from: string; p_to: string };
        Returns: { day: string; views: number; clicks: number };
      };
      analytics_devices: {
        Args: { p_location: string; p_from: string; p_to: string };
        Returns: { device: string; views: number };
      };
      analytics_referrers: {
        Args: { p_location: string; p_from: string; p_to: string };
        Returns: { referrer: string; views: number };
      };
    };
    Enums: {
      content_status: ContentStatus;
      reservation_status: ReservationStatus;
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type StorageBucket =
  | "menu-images"
  | "gallery-images"
  | "offer-images"
  | "homepage-images"
  | "restaurant-assets";

export const STORAGE_BUCKETS: StorageBucket[] = [
  "menu-images",
  "gallery-images",
  "offer-images",
  "homepage-images",
  "restaurant-assets",
];
