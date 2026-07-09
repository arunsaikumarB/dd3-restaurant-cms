/**
 * Shared schema for `page_content` sections.
 * Used by future admin CMS forms and public content readers (Phase 2+).
 *
 * `homepage_content` remains the source for home hero + about blurb;
 * all other page copy lives in `page_content`.
 */

export type PageContentPageKey =
  | "global"
  | "home"
  | "about"
  | "menu"
  | "offers"
  | "catering"
  | "parties"
  | "testimonials"
  | "contact"
  | "reservation"
  | "order"
  | "privacy_policy"
  | "terms_conditions";

export type PageContentFieldType = "text" | "textarea" | "cta" | "list" | "image";

export interface PageContentCtaValue {
  label: string;
  url: string;
}

export interface PageContentFieldBase {
  key: string;
  label: string;
  type: PageContentFieldType;
  required?: boolean;
  helpText?: string;
  /** Round-tripped on load/save but not rendered as an input (e.g. an internal id key). */
  hidden?: boolean;
}

export interface PageContentTextField extends PageContentFieldBase {
  type: "text" | "textarea";
  maxLength?: number;
}

export interface PageContentCtaField extends PageContentFieldBase {
  type: "cta";
}

/** Image upload sub-field — currently only supported inside list items (see PageContentListField). */
export interface PageContentImageField extends PageContentFieldBase {
  type: "image";
}

export interface PageContentListField extends PageContentFieldBase {
  type: "list";
  itemLabel: string;
  minItems?: number;
  maxItems?: number;
  fields: Array<PageContentTextField | PageContentImageField>;
}

export type PageContentField =
  | PageContentTextField
  | PageContentCtaField
  | PageContentListField;

export interface PageContentSectionDefinition {
  page: PageContentPageKey;
  section: string;
  label: string;
  description: string;
  fields: PageContentField[];
}

export const PAGE_CONTENT_SECTIONS: PageContentSectionDefinition[] = [
  {
    page: "global",
    section: "navbar",
    label: "Navbar CTAs",
    description: "Primary action button labels in the site header.",
    fields: [
      { key: "orderLabel", label: "Order button label", type: "text", maxLength: 40 },
      { key: "reserveLabel", label: "Reserve button label", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "global",
    section: "footer_pre_cta",
    label: "Footer Pre-CTA Strip",
    description: "Dark banner above the main footer.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 60 },
      { key: "title", label: "Title", type: "text", maxLength: 120 },
      { key: "orderCta", label: "Order button", type: "cta" },
      { key: "reserveCta", label: "Reserve button", type: "cta" },
    ],
  },
  {
    page: "global",
    section: "footer_brand",
    label: "Footer Brand Column",
    description: "Tagline and brand blurb in the footer.",
    fields: [
      { key: "tagline", label: "Tagline", type: "text", maxLength: 80 },
      { key: "blurb", label: "Brand blurb", type: "textarea", maxLength: 400 },
    ],
  },
  {
    page: "global",
    section: "footer_headings",
    label: "Footer Column Headings",
    description: "Section headings in the footer grid.",
    fields: [
      { key: "quickLinks", label: "Quick Links heading", type: "text", maxLength: 40 },
      { key: "openingHours", label: "Opening Hours heading", type: "text", maxLength: 40 },
      { key: "contactUs", label: "Contact Us heading", type: "text", maxLength: 40 },
      { key: "getInTouch", label: "Get in Touch link label", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "global",
    section: "footer_legal",
    label: "Footer Legal Links",
    description: "Privacy and terms links in the footer bar.",
    fields: [
      { key: "privacyCta", label: "Privacy Policy", type: "cta" },
      { key: "termsCta", label: "Terms of Service", type: "cta" },
    ],
  },
  {
    page: "home",
    section: "hero_ui",
    label: "Hero UI",
    description: "Non-CMS hero chrome (scroll hint).",
    fields: [{ key: "scrollHint", label: "Scroll hint", type: "text", maxLength: 20 }],
  },
  {
    page: "home",
    section: "entrance",
    label: "Entrance Scroll Sequence",
    description: "Overlay copy on the cinematic entrance sequence.",
    fields: [
      { key: "kicker", label: "Kicker", type: "text", maxLength: 60 },
      { key: "headline", label: "Headline", type: "text", maxLength: 120 },
    ],
  },
  {
    page: "home",
    section: "experience",
    label: "Choose Your Experience",
    description: "Section header, three experience cards, and ticker items.",
    fields: [
      { key: "eyebrowTemplate", label: "Eyebrow (use {name})", type: "text", maxLength: 80 },
      { key: "title", label: "Section title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Section subtitle", type: "textarea", maxLength: 300 },
      { key: "menuCardLabel", label: "Menu card label", type: "text", maxLength: 40 },
      { key: "menuCardHeadline", label: "Menu card headline (use {name})", type: "text", maxLength: 120 },
      { key: "menuCardSubtitle", label: "Menu card subtitle", type: "textarea", maxLength: 200 },
      { key: "menuCardCta", label: "Menu card CTA", type: "cta" },
      { key: "orderCardLabel", label: "Order card label", type: "text", maxLength: 40 },
      { key: "orderCardHeadline", label: "Order card headline", type: "text", maxLength: 120 },
      { key: "orderCardSubtitle", label: "Order card subtitle", type: "textarea", maxLength: 200 },
      { key: "reservationCardLabel", label: "Reservations card label", type: "text", maxLength: 40 },
      { key: "reservationCardHeadline", label: "Reservations card headline", type: "text", maxLength: 120 },
      { key: "reservationCardSubtitleFallback", label: "Reservations subtitle fallback", type: "textarea", maxLength: 200 },
      { key: "reservationCardCta", label: "Reservations card CTA", type: "cta" },
      {
        key: "tickerItems",
        label: "Ticker items",
        type: "list",
        itemLabel: "Ticker item",
        minItems: 1,
        maxItems: 12,
        fields: [{ key: "text", label: "Text", type: "text", maxLength: 120 }],
      },
    ],
  },
  {
    page: "home",
    section: "about_extended",
    label: "Home About Section (extended)",
    description: "Copy beyond homepage_content about_title/about_description.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      {
        key: "paragraphs",
        label: "Body paragraphs",
        type: "list",
        itemLabel: "Paragraph",
        minItems: 1,
        maxItems: 6,
        fields: [{ key: "text", label: "Paragraph", type: "textarea", maxLength: 600 }],
      },
      { key: "quote", label: "Blockquote", type: "textarea", maxLength: 300 },
      {
        key: "features",
        label: "Feature list",
        type: "list",
        itemLabel: "Feature",
        minItems: 1,
        maxItems: 8,
        fields: [{ key: "title", label: "Title", type: "text", maxLength: 60 }],
      },
      { key: "storyCta", label: "Our Story button", type: "cta" },
    ],
  },
  {
    page: "home",
    section: "catering_overlay",
    label: "Catering Scroll Sequence",
    description: "Overlay on the home catering image sequence.",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 60 },
      { key: "title", label: "Title", type: "text", maxLength: 120 },
      { key: "description", label: "Description", type: "textarea", maxLength: 400 },
      { key: "cta", label: "CTA", type: "cta" },
    ],
  },
  {
    page: "home",
    section: "signature",
    label: "Signature Dishes",
    description: "Section header, CTA, and feature row (dishes come from menu_items).",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 60 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      { key: "viewMenuCta", label: "View Full Menu CTA", type: "cta" },
      {
        key: "features",
        label: "Feature row",
        type: "list",
        itemLabel: "Feature",
        minItems: 1,
        maxItems: 6,
        fields: [
          { key: "title", label: "Title", type: "text", maxLength: 60 },
          { key: "description", label: "Description", type: "textarea", maxLength: 200 },
        ],
      },
    ],
  },
  {
    page: "home",
    section: "offers_teaser",
    label: "Exclusive Offers Teaser",
    description: "Section header and CTA for the homepage offers preview (offers themselves are managed on the Offers page).",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 60 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      { key: "viewAllCta", label: "View All Offers CTA", type: "cta" },
    ],
  },
  {
    page: "home",
    section: "ambience",
    label: "Experience the Ambience",
    description: "Section header and feature row.",
    fields: [
      { key: "eyebrowTemplate", label: "Eyebrow (use {name})", type: "text", maxLength: 80 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitleTemplate", label: "Subtitle (use {name})", type: "textarea", maxLength: 300 },
      {
        key: "features",
        label: "Feature row",
        type: "list",
        itemLabel: "Feature",
        minItems: 1,
        maxItems: 8,
        fields: [
          { key: "title", label: "Title", type: "text", maxLength: 60 },
          { key: "description", label: "Description", type: "textarea", maxLength: 200 },
        ],
      },
    ],
  },
  {
    page: "order",
    section: "order_options",
    label: "Order Option Cards",
    description:
      "Order Direct, Uber Eats, and DoorDash cards on the Order page. Each card's logo, description, badge, and button link are editable here.",
    fields: [
      { key: "srOnlyHeading", label: "Screen reader heading", type: "text", maxLength: 80 },
      {
        key: "items",
        label: "Order options",
        type: "list",
        itemLabel: "Option",
        minItems: 1,
        maxItems: 4,
        fields: [
          { key: "id", label: "ID", type: "text", maxLength: 20, hidden: true },
          { key: "brand", label: "Brand", type: "text", maxLength: 40 },
          { key: "image", label: "Logo / Image", type: "image" },
          { key: "imageAlt", label: "Image alt text", type: "text", maxLength: 120 },
          { key: "badge", label: "Delivery / pickup badge", type: "text", maxLength: 40 },
          { key: "description", label: "Description", type: "textarea", maxLength: 300 },
          { key: "buttonText", label: "Button label", type: "text", maxLength: 60 },
          {
            key: "buttonUrl",
            label: "Order button URL",
            type: "text",
            maxLength: 300,
            required: true,
            helpText: "The link this card's order button opens (in a new tab).",
          },
        ],
      },
    ],
  },
  {
    page: "about",
    section: "hero",
    label: "About Hero",
    description: "Page hero copy.",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "about",
    section: "mission",
    label: "Restaurant Story",
    description: "Mission / story section.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 120 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 500 },
    ],
  },
  {
    page: "about",
    section: "philosophy",
    label: "Our Philosophy",
    description: "Philosophy heading and pillar cards.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 400 },
      {
        key: "pillars",
        label: "Pillar cards",
        type: "list",
        itemLabel: "Pillar",
        minItems: 1,
        maxItems: 6,
        fields: [
          { key: "title", label: "Title", type: "text", maxLength: 60 },
          { key: "text", label: "Text", type: "textarea", maxLength: 300 },
        ],
      },
    ],
  },
  {
    page: "about",
    section: "cuisine",
    label: "Authentic Indian Cuisine",
    description: "Regional flavours section.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 60 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 400 },
    ],
  },
  {
    page: "about",
    section: "chef",
    label: "Culinary Team",
    description: "Chef / culinary team section.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 400 },
    ],
  },
  {
    page: "about",
    section: "timeline",
    label: "Timeline",
    description: "Company milestones.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      {
        key: "items",
        label: "Milestones",
        type: "list",
        itemLabel: "Milestone",
        minItems: 1,
        maxItems: 12,
        fields: [
          { key: "year", label: "Year", type: "text", maxLength: 8 },
          { key: "title", label: "Title", type: "text", maxLength: 80 },
          { key: "text", label: "Description", type: "textarea", maxLength: 400 },
        ],
      },
    ],
  },
  {
    page: "about",
    section: "cta",
    label: "Bottom CTA",
    description: "Call-to-action at the bottom of the About page.",
    fields: [
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "text", maxLength: 120 },
      { key: "cta", label: "Button", type: "cta" },
    ],
  },
  {
    page: "menu",
    section: "hero",
    label: "Menu Hero",
    description: "Page hero (use {location} in subtitle template).",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 40 },
      { key: "subtitleTemplate", label: "Subtitle template", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "menu",
    section: "toolbar",
    label: "Menu Toolbar",
    description: "Search and filter UI copy.",
    fields: [
      { key: "searchPlaceholder", label: "Search placeholder", type: "text", maxLength: 80 },
      { key: "allCategoriesLabel", label: "All categories label", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "menu",
    section: "category_subtitles",
    label: "Category Subtitles",
    description: "Editorial subtitles matched by category name keyword.",
    fields: [
      {
        key: "items",
        label: "Subtitle rules",
        type: "list",
        itemLabel: "Rule",
        minItems: 1,
        fields: [
          { key: "matchKey", label: "Match keyword (lowercase)", type: "text", maxLength: 60 },
          { key: "subtitle", label: "Subtitle", type: "text", maxLength: 120 },
        ],
      },
      { key: "defaultSubtitle", label: "Default subtitle", type: "text", maxLength: 120 },
    ],
  },
  {
    page: "menu",
    section: "empty_states",
    label: "Empty & Error States",
    description: "Messages when menu fails to load or has no results.",
    fields: [
      { key: "unavailableTitle", label: "Unavailable title", type: "text", maxLength: 80 },
      { key: "unavailableBody", label: "Unavailable body", type: "textarea", maxLength: 300 },
      { key: "comingSoonTitle", label: "Coming soon title", type: "text", maxLength: 80 },
      { key: "comingSoonBody", label: "Coming soon body", type: "textarea", maxLength: 300 },
      { key: "noResultsTitle", label: "No results title", type: "text", maxLength: 80 },
      { key: "noResultsBody", label: "No results body", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "menu",
    section: "cta",
    label: "Bottom CTA",
    description: "Reservation call-to-action below the menu.",
    fields: [
      { key: "title", label: "Title", type: "text", maxLength: 120 },
      { key: "subtitle", label: "Subtitle", type: "text", maxLength: 80 },
      { key: "cta", label: "Button", type: "cta" },
    ],
  },
  {
    page: "offers",
    section: "hero",
    label: "Offers Hero",
    description: "Page hero copy.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 60 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 400 },
    ],
  },
  {
    page: "offers",
    section: "location_picker",
    label: "Location Picker",
    description: "Heading above location cards.",
    fields: [
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      { key: "viewingBadge", label: "Active location badge", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "offers",
    section: "grid",
    label: "Offers Grid",
    description: "Card action labels.",
    fields: [
      { key: "viewDetailsLabel", label: "View Details label", type: "text", maxLength: 40 },
      { key: "orderNowLabel", label: "Order Now label", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "offers",
    section: "empty_state",
    label: "Empty State",
    description: "Copy when no offers are available.",
    fields: [
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "bodyTemplate", label: "Body (use {location})", type: "textarea", maxLength: 300 },
      { key: "selectPrompt", label: "Select location prompt", type: "textarea", maxLength: 200 },
    ],
  },
  {
    page: "catering",
    section: "hero",
    label: "Catering Hero",
    description: "Page hero copy.",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 40 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 400 },
    ],
  },
  {
    page: "catering",
    section: "intro",
    label: "Premium Catering Intro",
    description: "Section heading above service blocks.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 400 },
    ],
  },
  {
    page: "catering",
    section: "services",
    label: "Catering Services",
    description: "Service blocks (images from gallery).",
    fields: [
      {
        key: "items",
        label: "Services",
        type: "list",
        itemLabel: "Service",
        minItems: 1,
        maxItems: 8,
        fields: [
          { key: "tag", label: "Tag", type: "text", maxLength: 40 },
          { key: "title", label: "Title", type: "text", maxLength: 80 },
          { key: "text", label: "Description", type: "textarea", maxLength: 400 },
        ],
      },
    ],
  },
  {
    page: "catering",
    section: "cta",
    label: "Bottom CTA",
    description: "Quote request call-to-action.",
    fields: [
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      { key: "cta", label: "Button", type: "cta" },
    ],
  },
  {
    page: "parties",
    section: "hero",
    label: "Parties Hero",
    description: "Page hero copy.",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 60 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "parties",
    section: "events_intro",
    label: "Events Intro",
    description: "Heading above event type cards.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 400 },
    ],
  },
  {
    page: "parties",
    section: "events",
    label: "Event Types",
    description: "Private event type cards.",
    fields: [
      {
        key: "items",
        label: "Events",
        type: "list",
        itemLabel: "Event",
        minItems: 1,
        maxItems: 12,
        fields: [
          { key: "title", label: "Title", type: "text", maxLength: 60 },
          { key: "text", label: "Description", type: "textarea", maxLength: 300 },
        ],
      },
    ],
  },
  {
    page: "parties",
    section: "gallery_heading",
    label: "Gallery Heading",
    description: "Heading above the parties gallery grid.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
    ],
  },
  {
    page: "parties",
    section: "cta",
    label: "Bottom CTA",
    description: "Book private event call-to-action.",
    fields: [
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      { key: "cta", label: "Button", type: "cta" },
    ],
  },
  {
    page: "testimonials",
    section: "hero",
    label: "Testimonials Hero",
    description: "Page hero copy.",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 40 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 400 },
    ],
  },
  {
    page: "testimonials",
    section: "rating_stats",
    label: "Aggregate Rating",
    description: "Displayed rating summary.",
    fields: [
      { key: "averageLabel", label: "Average rating label", type: "text", maxLength: 40 },
      { key: "ratingValue", label: "Rating value", type: "text", maxLength: 8 },
      { key: "reviewCountText", label: "Review count text", type: "text", maxLength: 80 },
      { key: "verifiedBadge", label: "Verified badge", type: "text", maxLength: 40 },
      { key: "reviewSourceLabel", label: "Review source label", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "testimonials",
    section: "reviews_grid",
    label: "All Reviews Section",
    description: "Heading above the reviews grid.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
    ],
  },
  {
    page: "testimonials",
    section: "empty_states",
    label: "Empty States",
    description: "Messages when no reviews are published.",
    fields: [
      { key: "featuredTitle", label: "Featured empty title", type: "text", maxLength: 80 },
      { key: "featuredBody", label: "Featured empty body", type: "textarea", maxLength: 200 },
      { key: "gridTitle", label: "Grid empty title", type: "text", maxLength: 80 },
      { key: "gridBody", label: "Grid empty body", type: "textarea", maxLength: 200 },
    ],
  },
  {
    page: "testimonials",
    section: "cta",
    label: "Bottom CTA",
    description: "Reservation call-to-action.",
    fields: [
      { key: "title", label: "Title", type: "text", maxLength: 120 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 200 },
      { key: "cta", label: "Button", type: "cta" },
    ],
  },
  {
    page: "contact",
    section: "hero",
    label: "Contact Hero",
    description: "Page hero (use {location} in subtitle template).",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 40 },
      { key: "subtitleTemplate", label: "Subtitle template", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "contact",
    section: "info_section",
    label: "Visit or Reach Out",
    description: "Left column heading and field labels.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      { key: "addressLabel", label: "Address label", type: "text", maxLength: 30 },
      { key: "phoneLabel", label: "Phone label", type: "text", maxLength: 30 },
      { key: "emailLabel", label: "Email label", type: "text", maxLength: 30 },
      { key: "hoursLabel", label: "Business hours label", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "contact",
    section: "form",
    label: "Contact Form",
    description: "Form headings, labels, placeholders, and submit copy.",
    fields: [
      { key: "heading", label: "Form heading", type: "text", maxLength: 60 },
      { key: "nameLabel", label: "Name label", type: "text", maxLength: 20 },
      { key: "namePlaceholder", label: "Name placeholder", type: "text", maxLength: 40 },
      { key: "emailLabel", label: "Email label", type: "text", maxLength: 20 },
      { key: "emailPlaceholder", label: "Email placeholder", type: "text", maxLength: 40 },
      { key: "phoneLabel", label: "Phone label", type: "text", maxLength: 20 },
      { key: "phonePlaceholder", label: "Phone placeholder", type: "text", maxLength: 40 },
      { key: "messageLabel", label: "Message label", type: "text", maxLength: 20 },
      { key: "messagePlaceholder", label: "Message placeholder", type: "text", maxLength: 60 },
      { key: "submitLabel", label: "Submit button", type: "text", maxLength: 30 },
      { key: "submittingLabel", label: "Submitting label", type: "text", maxLength: 30 },
      { key: "sendAnotherLabel", label: "Send another label", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "contact",
    section: "form_messages",
    label: "Contact Form Messages",
    description: "Validation and success messages.",
    fields: [
      { key: "validationName", label: "Name required", type: "text", maxLength: 80 },
      { key: "validationEmail", label: "Email invalid", type: "text", maxLength: 80 },
      { key: "validationPhone", label: "Phone required", type: "text", maxLength: 80 },
      { key: "validationMessage", label: "Message required", type: "text", maxLength: 80 },
      { key: "successTemplate", label: "Success (use {name})", type: "text", maxLength: 120 },
      { key: "successFallback", label: "Success fallback", type: "text", maxLength: 120 },
    ],
  },
  {
    page: "contact",
    section: "bottom_cta",
    label: "Bottom CTA",
    description: "Reservation call-to-action at page bottom.",
    fields: [
      { key: "title", label: "Title", type: "text", maxLength: 120 },
      { key: "subtitle", label: "Subtitle", type: "text", maxLength: 80 },
      { key: "reserveNowLabel", label: "Reserve Now label", type: "text", maxLength: 30 },
      { key: "reserveOnlineLabel", label: "Reserve Online label", type: "text", maxLength: 30 },
    ],
  },
  {
    page: "reservation",
    section: "hero",
    label: "Reservation Hero",
    description: "Page hero (use {location} in subtitle template).",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 60 },
      { key: "subtitleTemplate", label: "Subtitle template", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "reservation",
    section: "stats",
    label: "Booking Stats Cards",
    description: "Four stat cards beside the booking form.",
    fields: [
      {
        key: "items",
        label: "Stats",
        type: "list",
        itemLabel: "Stat",
        minItems: 1,
        maxItems: 6,
        fields: [
          { key: "label", label: "Label", type: "text", maxLength: 40 },
          { key: "value", label: "Value", type: "text", maxLength: 40 },
        ],
      },
    ],
  },
  {
    page: "reservation",
    section: "booking_form",
    label: "Booking Form",
    description: "Reservation form copy and labels.",
    fields: [
      { key: "stepLabel", label: "Step label", type: "text", maxLength: 60 },
      { key: "title", label: "Form title", type: "text", maxLength: 60 },
      { key: "subtitle", label: "Form subtitle", type: "textarea", maxLength: 300 },
      { key: "locationLabel", label: "Location field label", type: "text", maxLength: 40 },
      { key: "dateLabel", label: "Date field label", type: "text", maxLength: 20 },
      { key: "guestsLabel", label: "Guests field label", type: "text", maxLength: 20 },
      { key: "timeSlotsLabel", label: "Time slots label", type: "text", maxLength: 40 },
      { key: "loadingSlots", label: "Loading slots message", type: "text", maxLength: 60 },
      { key: "noSlots", label: "No slots message", type: "text", maxLength: 80 },
      { key: "nameLabel", label: "Name label", type: "text", maxLength: 20 },
      { key: "namePlaceholder", label: "Name placeholder", type: "text", maxLength: 40 },
      { key: "phoneLabel", label: "Phone label", type: "text", maxLength: 20 },
      { key: "phonePlaceholder", label: "Phone placeholder", type: "text", maxLength: 40 },
      { key: "emailLabel", label: "Email label", type: "text", maxLength: 20 },
      { key: "emailPlaceholder", label: "Email placeholder", type: "text", maxLength: 40 },
      { key: "requestsLabel", label: "Special requests label", type: "text", maxLength: 40 },
      { key: "requestsPlaceholder", label: "Special requests placeholder", type: "text", maxLength: 80 },
      { key: "submitLabel", label: "Submit button", type: "text", maxLength: 30 },
      { key: "submittingLabel", label: "Submitting label", type: "text", maxLength: 30 },
      { key: "successTitle", label: "Success title", type: "text", maxLength: 60 },
      { key: "successAnotherLabel", label: "Make another label", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "reservation",
    section: "booking_messages",
    label: "Booking Success Message",
    description: "Success body template (use {name} and {guests}).",
    fields: [
      { key: "successTemplate", label: "Success template", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "reservation",
    section: "features",
    label: "Why Reserve",
    description: "Feature cards below the booking form.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      {
        key: "items",
        label: "Features",
        type: "list",
        itemLabel: "Feature",
        minItems: 1,
        maxItems: 8,
        fields: [
          { key: "title", label: "Title", type: "text", maxLength: 60 },
          { key: "description", label: "Description", type: "textarea", maxLength: 300 },
        ],
      },
    ],
  },
  {
    page: "reservation",
    section: "gallery",
    label: "Spaces Gallery",
    description: "Gallery strip labels.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 60 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      {
        key: "items",
        label: "Gallery labels",
        type: "list",
        itemLabel: "Slide",
        minItems: 1,
        maxItems: 12,
        fields: [{ key: "label", label: "Label", type: "text", maxLength: 40 }],
      },
    ],
  },
  {
    page: "reservation",
    section: "contact_section",
    label: "Contact Section",
    description: "Contact cards section headings.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 80 },
      { key: "subtitle", label: "Subtitle", type: "textarea", maxLength: 300 },
      { key: "phoneTitle", label: "Phone card title", type: "text", maxLength: 30 },
      { key: "emailTitle", label: "Email card title", type: "text", maxLength: 30 },
      { key: "visitTitle", label: "Visit card title", type: "text", maxLength: 30 },
      { key: "hoursTitle", label: "Hours card title", type: "text", maxLength: 40 },
    ],
  },
  {
    page: "reservation",
    section: "map_section",
    label: "Map Section",
    description: "Map heading.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 60 },
    ],
  },
  {
    page: "reservation",
    section: "sticky_cta",
    label: "Sticky CTA",
    description: "Mobile sticky reservation button labels.",
    fields: [
      { key: "reserveTableLabel", label: "Reserve My Table", type: "text", maxLength: 30 },
      { key: "reserveOnlineLabel", label: "Reserve Online", type: "text", maxLength: 30 },
    ],
  },
  {
    page: "privacy_policy",
    section: "hero",
    label: "Privacy Policy Hero",
    description: "Page hero (use {name} and {location} in the subtitle template).",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 60 },
      { key: "subtitleTemplate", label: "Subtitle template", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "privacy_policy",
    section: "content",
    label: "Policy Content",
    description:
      "Intro paragraph and body sections (use {name}, {location}, {address}, {year}, {email}, {phone}).",
    fields: [
      { key: "introTemplate", label: "Intro paragraph", type: "textarea", maxLength: 600 },
      {
        key: "sections",
        label: "Sections",
        type: "list",
        itemLabel: "Section",
        minItems: 1,
        maxItems: 12,
        fields: [
          { key: "title", label: "Heading", type: "text", maxLength: 80 },
          { key: "textTemplate", label: "Body text", type: "textarea", maxLength: 800 },
        ],
      },
    ],
  },
  {
    page: "terms_conditions",
    section: "hero",
    label: "Terms & Conditions Hero",
    description: "Page hero (use {name} and {location} in the subtitle template).",
    fields: [
      { key: "label", label: "Label", type: "text", maxLength: 40 },
      { key: "title", label: "Title", type: "text", maxLength: 60 },
      { key: "subtitleTemplate", label: "Subtitle template", type: "textarea", maxLength: 300 },
    ],
  },
  {
    page: "terms_conditions",
    section: "content",
    label: "Terms Content",
    description:
      "Intro paragraph and body sections (use {name}, {location}, {year}, {email}, {phone}).",
    fields: [
      { key: "introTemplate", label: "Intro paragraph", type: "textarea", maxLength: 600 },
      {
        key: "sections",
        label: "Sections",
        type: "list",
        itemLabel: "Section",
        minItems: 1,
        maxItems: 12,
        fields: [
          { key: "title", label: "Heading", type: "text", maxLength: 80 },
          { key: "textTemplate", label: "Body text", type: "textarea", maxLength: 800 },
        ],
      },
    ],
  },
];

export function getPageContentSectionDefinition(
  page: PageContentPageKey,
  section: string,
): PageContentSectionDefinition | undefined {
  return PAGE_CONTENT_SECTIONS.find((s) => s.page === page && s.section === section);
}

export function getPageContentSectionsForPage(
  page: PageContentPageKey,
): PageContentSectionDefinition[] {
  return PAGE_CONTENT_SECTIONS.filter((s) => s.page === page);
}

export const PAGE_CONTENT_LOCATION_IDS = [
  "south-plainfield",
  "oak-tree",
  "lawrenceville",
] as const;

export type PageContentLocationId = (typeof PAGE_CONTENT_LOCATION_IDS)[number];

export type PageContentRow = {
  location_id: PageContentLocationId;
  page: PageContentPageKey;
  section: string;
  content: Record<string, unknown>;
};
