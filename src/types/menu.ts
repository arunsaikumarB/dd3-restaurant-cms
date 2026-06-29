export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categorySlug: string;
  featured: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  rawName: string;
  itemCount: number;
  items: MenuItem[];
}

export interface MenuData {
  generatedAt: string;
  source: string;
  totalItems: number;
  categories: MenuCategory[];
}
