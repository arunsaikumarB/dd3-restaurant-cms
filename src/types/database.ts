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
  email: string | null;
  address: string | null;
  google_maps: string | null;
  opening_hours: Json | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  logo: string | null;
  favicon: string | null;
}

export interface HomepageContent extends Timestamps {
  id: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image: string | null;
  hero_video: string | null;
  cta_text: string | null;
  cta_link: string | null;
  about_title: string | null;
  about_description: string | null;
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
}

export interface Offer extends Timestamps {
  id: string;
  location_id: RestaurantLocationId;
  title: string;
  description: string | null;
  banner: string | null;
  discount: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
}

export interface GalleryImage extends Timestamps {
  id: string;
  image: string;
  category: string | null;
  alt_text: string | null;
  caption: string | null;
  featured: boolean;
  visible: boolean;
  display_order: number;
}

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

export type MenuCategoryInsert = Omit<MenuCategory, "id" | "created_at" | "updated_at"> &
  Partial<Pick<MenuCategory, "id" | "created_at" | "updated_at">>;

export type MenuItemInsert = Omit<MenuItem, "id" | "created_at" | "updated_at"> &
  Partial<Pick<MenuItem, "id" | "created_at" | "updated_at">>;

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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
