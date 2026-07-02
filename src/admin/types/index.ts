import type { ReactNode } from "react";

export type Status = "active" | "inactive" | "draft" | "pending" | "approved" | "rejected";

export type VegType = "veg" | "non-veg";

export interface AdminStat {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: string;
  to?: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  target: string;
  time: string;
  type: "menu" | "review" | "offer" | "gallery" | "settings" | "integration";
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  status: Status;
  vegType: VegType;
  popular: boolean;
  chefSpecial: boolean;
}

export interface Offer {
  id: string;
  name: string;
  discount: string;
  banner: string;
  startDate: string;
  endDate: string;
  status: Status;
}

export interface GalleryImage {
  id: string;
  url: string;
  category: string;
  title: string;
}

export interface Review {
  id: string;
  customer: string;
  rating: number;
  review: string;
  date: string;
  status: "pending" | "approved" | "rejected";
}

export interface HomepageSection {
  id: string;
  label: string;
  description: string;
  fields: { key: string; label: string; value: string; type: "text" | "textarea" | "url" }[];
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}
