export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categorySlug: string;
  featured: boolean;
  image?: string | null;
  veg?: boolean;
  popular?: boolean;
  chefSpecial?: boolean;
  spiceLevel?: number | null;
  available?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  rawName: string;
  itemCount: number;
  image?: string | null;
  items: MenuItem[];
}

export interface MenuData {
  generatedAt: string;
  source: string;
  totalItems: number;
  categories: MenuCategory[];
}
