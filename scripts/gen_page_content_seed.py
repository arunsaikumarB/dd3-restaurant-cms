"""Generate seed SQL for 024_page_content migration. Run once then delete if desired."""
import json
from pathlib import Path

sections: list[tuple[str, str, dict]] = []


def add(page: str, section: str, content: dict) -> None:
    sections.append((page, section, content))


add("global", "navbar", {"orderLabel": "Order Now", "reserveLabel": "Reserve a Table"})
add(
    "global",
    "footer_pre_cta",
    {
        "eyebrow": "Ready to dine?",
        "title": "Reserve your table or order online",
        "orderCta": {"label": "Order Now", "url": "/order"},
        "reserveCta": {"label": "Reserve a Table", "url": "/reservation"},
    },
)
add(
    "global",
    "footer_brand",
    {
        "tagline": "Authentic Indian Restaurant",
        "blurb": "Authentic Indian flavours crafted with tradition, premium ingredients and unforgettable hospitality — since 2018.",
    },
)
add(
    "global",
    "footer_headings",
    {
        "quickLinks": "Quick Links",
        "openingHours": "Opening Hours",
        "contactUs": "Contact Us",
        "getInTouch": "Get in Touch",
    },
)
add(
    "global",
    "footer_legal",
    {
        "privacyCta": {"label": "Privacy Policy", "url": "/contact"},
        "termsCta": {"label": "Terms of Service", "url": "/contact"},
    },
)
add("home", "hero_ui", {"scrollHint": "Scroll"})
add(
    "home",
    "entrance",
    {"kicker": "A warm welcome", "headline": "Every detail, designed to greet you."},
)
add(
    "home",
    "experience",
    {
        "eyebrowTemplate": "Discover {name}",
        "title": "Choose Your Experience",
        "subtitle": "Whether you're dining in, ordering online, or exploring our menu, your next experience starts here.",
        "menuCardLabel": "The Menu",
        "menuCardHeadline": "{name} — a feast made with love",
        "menuCardSubtitle": "Explore our full collection of biryanis, curries, tandoori and desserts.",
        "menuCardCta": {"label": "Explore Menu", "url": "/menu"},
        "orderCardLabel": "The Kitchen",
        "orderCardHeadline": "In the heart of every flavour",
        "orderCardSubtitle": "Fresh, bold and delivered with the same passion as our dining room.",
        "reservationCardLabel": "Reservations",
        "reservationCardHeadline": "Of the city, every plate",
        "reservationCardSubtitleFallback": "An elegant setting for unforgettable evenings.",
        "reservationCardCta": {"label": "Reserve a Table", "url": "/reservation"},
        "tickerItems": [
            {"text": "Chef's Special Tasting Menu — Book in Advance"},
            {"text": "Weekend Mandi Nights — Every Friday & Saturday"},
            {"text": "Happy Hours 5 PM – 7 PM"},
            {"text": "Private Dining Available for Groups"},
            {"text": "Authentic Dum Biryani — Slow-Cooked Daily"},
        ],
    },
)
add(
    "home",
    "about_extended",
    {
        "eyebrow": "Our Story",
        "paragraphs": [
            {
                "text": "At Desi Dhamaka, we bring the soul of Hyderabad and Andhra Pradesh to your table — rich biryanis, bold curries, and time-honoured recipes passed down through generations."
            },
            {
                "text": "Every dish begins with fresh, quality ingredients, prepared to order with care and served in a welcoming space designed for families, celebrations, and quiet evenings alike."
            },
            {
                "text": "Our team believes hospitality is as essential as spice — warm welcomes, attentive service, and the comfort of knowing every meal is halal and crafted with integrity."
            },
        ],
        "quote": "Every meal we serve is prepared with tradition, passion, and the warmth of Indian hospitality.",
        "features": [
            {"title": "Authentic Recipes"},
            {"title": "Fresh Ingredients"},
            {"title": "Family Friendly"},
            {"title": "Halal Cuisine"},
        ],
        "storyCta": {"label": "Our Story", "url": "/about"},
    },
)
add(
    "home",
    "catering_overlay",
    {
        "label": "Desi Dhamaka Catering",
        "title": "Every Celebration Deserves Extraordinary Food",
        "description": "From weddings and birthdays to corporate events and festive gatherings, our chefs prepare unforgettable Indian cuisine tailored to your guests and your occasion.",
        "cta": {"label": "Explore Catering", "url": "/catering"},
    },
)
add(
    "home",
    "signature",
    {
        "eyebrow": "Desi Dhamaka Signatures",
        "title": "Signature Special Dishes",
        "subtitle": "Discover our chef's most celebrated creations, prepared with authentic Indian flavours, premium ingredients, and unforgettable presentation.",
        "viewMenuCta": {"label": "View Full Menu", "url": "/menu"},
        "features": [
            {"title": "Fresh Ingredients", "description": "We source only the finest seasonal ingredients."},
            {"title": "Authentic Indian Recipes", "description": "Time-honoured techniques passed through generations."},
            {"title": "Prepared Fresh Daily", "description": "Every dish crafted to order in our kitchen."},
            {"title": "Exceptional Dining Experience", "description": "Impeccable food, ambience, and hospitality."},
        ],
    },
)
add(
    "home",
    "ambience",
    {
        "eyebrowTemplate": "{name} Experience",
        "title": "Experience the Ambience",
        "subtitleTemplate": "Every corner of {name} is designed to bring together authentic Indian hospitality, warm interiors, and unforgettable dining moments.",
        "features": [
            {"title": "Authentic Indian Cuisine", "description": "Traditional recipes from across India."},
            {"title": "Premium Ingredients", "description": "Only the finest quality sourced daily."},
            {"title": "Freshly Prepared", "description": "Every dish made to order with care."},
            {"title": "Luxury Dining", "description": "An elegant setting for every occasion."},
            {"title": "Exceptional Hospitality", "description": "Warm service that makes you feel at home."},
        ],
        "ribbonItems": [
            {"text": "Live Weekend Buffet"},
            {"text": "Authentic Hyderabadi Dum Biryani"},
            {"text": "Catering Available"},
            {"text": "Reserve Your Table"},
        ],
    },
)

add(
    "about",
    "hero",
    {
        "label": "About Us",
        "title": "Our Story",
        "subtitle": "A journey rooted in tradition, guided by passion and shaped by the flavours of India.",
    },
)
add(
    "about",
    "mission",
    {
        "eyebrow": "Restaurant Story",
        "title": "Where tradition meets modern hospitality",
        "subtitle": "Desi Dhamaka was born from a simple belief — that great food brings people together. From our first service to today, every dish tells a story of heritage, family recipes and the warmth of Indian hospitality.",
    },
)
add(
    "about",
    "philosophy",
    {
        "eyebrow": "Our Philosophy",
        "title": "Crafted with intention",
        "subtitle": "We honour time-tested techniques — dum cooking, tandoor firing and slow simmering — while embracing the precision and presentation of modern fine dining.",
        "pillars": [
            {"title": "Authenticity", "text": "Whole spices, hand-ground masalas and recipes passed through generations."},
            {"title": "Quality", "text": "Premium ingredients sourced with care, prepared fresh for every service."},
            {"title": "Hospitality", "text": "Every guest is family. Every table, an experience worth remembering."},
        ],
    },
)
add(
    "about",
    "cuisine",
    {
        "eyebrow": "Authentic Indian Cuisine",
        "title": "Flavours from every region",
        "subtitle": "From Hyderabadi dum biryani to creamy North Indian curries, Indo-Chinese favourites and Arabian mandi — our menu celebrates the diversity of the subcontinent with elegance and depth.",
    },
)
add(
    "about",
    "chef",
    {
        "eyebrow": "Culinary Team",
        "title": "Crafted with passion",
        "subtitle": "Our culinary team blends classical Indian techniques with contemporary presentation — every plate a balance of aroma, texture and visual artistry.",
    },
)
add(
    "about",
    "timeline",
    {
        "eyebrow": "Timeline",
        "title": "Our journey",
        "subtitle": "Milestones that shaped Desi Dhamaka into the destination it is today.",
        "items": [
            {"year": "2018", "title": "The Beginning", "text": "Desi Dhamaka opens its doors with a vision to bring authentic Indian hospitality to the community."},
            {"year": "2020", "title": "Expanding the Kitchen", "text": "Our tandoor and dum kitchen grow, introducing signature biryanis and mandi to loyal guests."},
            {"year": "2023", "title": "Award Recognition", "text": "Recognised for excellence in flavour, service and ambience across the region."},
            {"year": "2026", "title": "A New Chapter", "text": "Grand reopening with a refined dining experience, live counters and premium private events."},
        ],
    },
)
add(
    "about",
    "cta",
    {
        "title": "Experience Desi Dhamaka",
        "subtitle": "Reserve your table and taste the tradition.",
        "cta": {"label": "Reserve Now", "url": "/reservation"},
    },
)

add(
    "menu",
    "hero",
    {
        "label": "The Menu",
        "title": "Menu",
        "subtitleTemplate": "Discover authentic Indian flavours crafted with tradition, premium ingredients and unforgettable taste at {location}.",
    },
)
add(
    "menu",
    "toolbar",
    {"searchPlaceholder": "Search by food name…", "allCategoriesLabel": "All Categories"},
)
subtitle_rules = [
    ("biryani", "Traditional dum-cooked rice specialities"),
    ("soups", "Warm, aromatic beginnings"),
    ("desserts", "Sweet finales crafted with care"),
    ("naans", "Fresh from the tandoor"),
    ("chai", "Slow-steeped, soul-warming brews"),
    ("coffee", "Bold roasts and spiced pours"),
    ("breakfast", "Morning flavours to start your day"),
    ("mocktails", "Refreshing, alcohol-free creations"),
    ("soft drinks", "Classic refreshments"),
    ("snacks", "Light bites and street-side favourites"),
    ("pulavs", "Fragrant rice delicacies"),
    ("thali", "Complete meals on a single platter"),
    ("trays", "Generous platters for sharing"),
    ("kebab and tandoori", "Smoky, char-grilled perfection"),
    ("vegetarian appetizers", "Plant-forward starters"),
    ("non vegetarian appetizers", "Bold flavours to begin"),
    ("vegetarian entrees", "Comforting vegetarian classics"),
    ("non vegetarian entrees", "Rich, slow-simmered favourites"),
    ("vegetarian rice & biryani", "Aromatic rice specialities"),
    ("dd specials", "House signatures you won't forget"),
    ("dd special mandi", "Slow-roasted mandi masterpieces"),
    ("dd family packs (to go only)", "Feast-sized portions for home"),
    ("grand opening buffet", "A celebratory spread for every palate"),
    ("kids menu", "Flavours the little ones will love"),
    ("cooker pulav", "One-pot rice comfort"),
    ("monday offers", "Weekly delights at special value"),
]
add(
    "menu",
    "category_subtitles",
    {
        "items": [{"matchKey": k, "subtitle": v} for k, v in subtitle_rules],
        "defaultSubtitle": "Curated selections from our kitchen",
    },
)
add(
    "menu",
    "empty_states",
    {
        "unavailableTitle": "Menu unavailable",
        "unavailableBody": "We couldn't load the menu right now. Please refresh the page or try again later.",
        "comingSoonTitle": "Menu coming soon",
        "comingSoonBody": "Our menu is being updated. Please check back shortly.",
        "noResultsTitle": "No dishes found",
        "noResultsBody": "Try a different search term or category filter.",
    },
)
add(
    "menu",
    "cta",
    {
        "title": "Ready to Experience Desi Dhamaka?",
        "subtitle": "Reserve Your Table Today",
        "cta": {"label": "Reserve Now", "url": "/reservation"},
    },
)

add(
    "offers",
    "hero",
    {
        "eyebrow": "Exclusive Promotions",
        "title": "Exclusive Offers",
        "subtitle": "Discover our latest promotions, seasonal specials, lunch deals, buffet offers, and limited-time experiences across all Desi Dhamaka locations.",
    },
)
add(
    "offers",
    "location_picker",
    {
        "title": "Choose Your Location",
        "subtitle": "Select a branch to view exclusive offers available at that restaurant.",
        "viewingBadge": "Viewing Offers",
    },
)
add("offers", "grid", {"viewDetailsLabel": "View Details", "orderNowLabel": "Order Now"})
add(
    "offers",
    "empty_state",
    {
        "title": "No offers available",
        "bodyTemplate": "There are no active promotions for {location} right now. Check back soon.",
        "selectPrompt": "Select a location above to view available promotions.",
    },
)

add(
    "catering",
    "hero",
    {
        "label": "Events & Catering",
        "title": "Catering",
        "subtitle": "Elevated Indian cuisine for corporate events, weddings and celebrations — delivered with the same passion as our dining room.",
    },
)
add(
    "catering",
    "intro",
    {
        "eyebrow": "Premium Catering",
        "title": "Events worth remembering",
        "subtitle": "Whether you are hosting fifty guests or five hundred, Desi Dhamaka brings restaurant-quality flavour, presentation and service to your venue.",
    },
)
add(
    "catering",
    "services",
    {
        "items": [
            {"tag": "50–500 Guests", "title": "Corporate Events", "text": "Impress clients and colleagues with curated menus, elegant presentation and seamless service for conferences, galas and office celebrations."},
            {"tag": "Custom Packages", "title": "Wedding Catering", "text": "From intimate ceremonies to grand receptions — bespoke menus, live stations and a team dedicated to making your day unforgettable."},
            {"tag": "Any Size", "title": "Birthday Parties", "text": "Celebrate milestones with flavour. Custom menus, themed setups and attentive service for gatherings of every size."},
            {"tag": "Live Experience", "title": "Live Counters", "text": "Tandoor, chaat, biryani and dessert counters that bring theatre and aroma to your event — cooked fresh before your guests."},
            {"tag": "Fully Tailored", "title": "Custom Menus", "text": "Vegetarian, halal, spice-level preferences and regional specialities — every menu tailored to your vision and guest list."},
        ]
    },
)
add(
    "catering",
    "cta",
    {
        "title": "Plan Your Event",
        "subtitle": "Tell us about your event and we'll craft the perfect catering experience.",
        "cta": {"label": "Request a Quote", "url": "/contact#catering"},
    },
)

add(
    "parties",
    "hero",
    {
        "label": "Private Events",
        "title": "Private Parties",
        "subtitle": "Luxury private dining and event spaces for celebrations that deserve something extraordinary.",
    },
)
add(
    "parties",
    "events_intro",
    {
        "eyebrow": "Luxury Events",
        "title": "Celebrate in style",
        "subtitle": "From intimate dinners to grand celebrations, our private party experience combines exceptional cuisine with impeccable service.",
    },
)
add(
    "parties",
    "events",
    {
        "items": [
            {"title": "Private Dining", "text": "An intimate room for exclusive gatherings — personalised menus, dedicated service and complete privacy."},
            {"title": "Birthday Celebrations", "text": "Make their day extraordinary with custom décor, curated menus and a celebration they'll never forget."},
            {"title": "Graduation", "text": "Mark the milestone with a feast worthy of the achievement — family-style or plated service available."},
            {"title": "Anniversary", "text": "Romantic settings, candlelit ambience and dishes crafted for two or twenty."},
            {"title": "Corporate Gatherings", "text": "Team dinners, product launches and executive meetings in a refined, private setting."},
            {"title": "Cultural Events", "text": "Celebrate milestones and traditions with authentic cuisine and curated hospitality."},
        ]
    },
)
add("parties", "gallery_heading", {"eyebrow": "Gallery", "title": "Moments we create"})
add(
    "parties",
    "cta",
    {
        "title": "Book Your Private Event",
        "subtitle": "Let us create an unforgettable celebration tailored to you.",
        "cta": {"label": "Book Now", "url": "/contact#parties"},
    },
)

add(
    "testimonials",
    "hero",
    {
        "label": "Guest Reviews",
        "title": "Testimonials",
        "subtitle": "Stories from guests who have experienced the warmth, flavour and hospitality of Desi Dhamaka.",
    },
)
add(
    "testimonials",
    "rating_stats",
    {
        "averageLabel": "Average Rating",
        "ratingValue": "4.9",
        "reviewCountText": "Based on 500+ Google Reviews",
        "verifiedBadge": "Google Verified",
        "reviewSourceLabel": "Google Review",
    },
)
add("testimonials", "reviews_grid", {"eyebrow": "All Reviews", "title": "What our guests say"})
add(
    "testimonials",
    "empty_states",
    {
        "featuredTitle": "Reviews coming soon",
        "featuredBody": "Guest testimonials will appear here once published.",
        "gridTitle": "No reviews yet",
        "gridBody": "Be the first to share your experience with us.",
    },
)
add(
    "testimonials",
    "cta",
    {
        "title": "Join Our Community of Happy Guests",
        "subtitle": "Reserve your table and create your own memorable experience.",
        "cta": {"label": "Reserve Now", "url": "/reservation"},
    },
)

add(
    "contact",
    "hero",
    {
        "label": "Get in Touch",
        "title": "Contact",
        "subtitleTemplate": "We'd love to hear from you in {location} — reservations, catering enquiries or simply a hello.",
    },
)
add(
    "contact",
    "info_section",
    {
        "eyebrow": "Get in Touch",
        "title": "Visit or reach out",
        "subtitle": "Our team is ready to assist with reservations, private events and catering requests.",
        "addressLabel": "Address",
        "phoneLabel": "Phone",
        "emailLabel": "Email",
        "hoursLabel": "Business Hours",
    },
)
add(
    "contact",
    "form",
    {
        "heading": "Send a message",
        "nameLabel": "Name",
        "namePlaceholder": "Your name",
        "emailLabel": "Email",
        "emailPlaceholder": "Email address",
        "phoneLabel": "Phone",
        "phonePlaceholder": "Phone number",
        "messageLabel": "Message",
        "messagePlaceholder": "How can we help?",
        "submitLabel": "Send Message",
        "submittingLabel": "Sending…",
        "sendAnotherLabel": "Send another message",
    },
)
add(
    "contact",
    "form_messages",
    {
        "validationName": "Please enter your name.",
        "validationEmail": "Please enter a valid email address.",
        "validationPhone": "Please enter your phone number.",
        "validationMessage": "Please enter a message.",
        "successTemplate": "Thank you, {name}. We'll be in touch shortly.",
        "successFallback": "Thank you. We'll be in touch shortly.",
    },
)
add(
    "contact",
    "bottom_cta",
    {
        "title": "Ready to Experience Desi Dhamaka?",
        "subtitle": "Reserve Your Table Today",
        "reserveNowLabel": "Reserve Now",
        "reserveOnlineLabel": "Reserve Online",
    },
)

add(
    "reservation",
    "hero",
    {
        "label": "Reservations",
        "title": "Reserve Your Table",
        "subtitleTemplate": "Experience authentic Indian hospitality, unforgettable flavours, and elegant dining at {location}.",
    },
)
add(
    "reservation",
    "stats",
    {
        "items": [
            {"label": "Google Rating", "value": "★★★★★"},
            {"label": "Authentic Dishes", "value": "300+"},
            {"label": "Private Dining", "value": "Available"},
            {"label": "Weekend Buffet", "value": "Live"},
        ]
    },
)
add(
    "reservation",
    "booking_form",
    {
        "stepLabel": "Step 1 of 1 — Your Details",
        "title": "Book Your Experience",
        "subtitle": "Select your preferred date, time, and party size. We'll prepare an unforgettable evening.",
        "locationLabel": "Restaurant Location",
        "dateLabel": "Date",
        "guestsLabel": "Guests",
        "timeSlotsLabel": "Available Time Slots",
        "loadingSlots": "Finding available times…",
        "noSlots": "No times available for this date.",
        "nameLabel": "Name",
        "namePlaceholder": "Your full name",
        "phoneLabel": "Phone",
        "phonePlaceholder": "(555) 123-4567",
        "emailLabel": "Email",
        "emailPlaceholder": "you@example.com",
        "requestsLabel": "Special Requests",
        "requestsPlaceholder": "Allergies, celebrations, seating preferences…",
        "submitLabel": "Reserve My Table",
        "submittingLabel": "Reserving…",
        "successTitle": "Reservation Requested",
        "successAnotherLabel": "Make Another Reservation",
    },
)
add(
    "reservation",
    "booking_messages",
    {
        "successTemplate": "Thank you, {name}. Your request for {guests} guest(s) has been received. We'll confirm shortly.",
    },
)
add(
    "reservation",
    "features",
    {
        "eyebrow": "Why Reserve",
        "title": "An Experience Worth Savouring",
        "subtitle": "From the first welcome to the final course, every detail is crafted for memorable dining.",
        "items": [
            {"title": "Authentic Indian Cuisine", "description": "Traditional recipes from across India, prepared with premium ingredients and timeless technique."},
            {"title": "Luxury Dining Experience", "description": "An elegant atmosphere with warm hospitality — every detail curated for memorable evenings."},
            {"title": "Private Events", "description": "Dedicated spaces for celebrations, corporate gatherings, and intimate private dining."},
            {"title": "Family Friendly", "description": "Spacious seating and a welcoming menu for guests of every age and palate."},
        ],
    },
)
add(
    "reservation",
    "gallery",
    {
        "eyebrow": "Our Spaces",
        "title": "A Glimpse Inside",
        "subtitle": "Reception, dining halls, private rooms, and the artistry of our kitchen.",
        "items": [
            {"label": "Reception"},
            {"label": "Dining Hall"},
            {"label": "Private Dining"},
            {"label": "Buffet"},
            {"label": "Chef"},
        ],
    },
)
add(
    "reservation",
    "contact_section",
    {
        "eyebrow": "Restaurant Information",
        "title": "We're Here for You",
        "subtitle": "Reach out directly or visit us — our team is ready to welcome you.",
        "phoneTitle": "Call Us",
        "emailTitle": "Email",
        "visitTitle": "Visit Us",
        "hoursTitle": "Business Hours",
    },
)
add("reservation", "map_section", {"eyebrow": "Find Us", "title": "Visit Desi Dhamaka"})
add(
    "reservation",
    "sticky_cta",
    {"reserveTableLabel": "Reserve My Table", "reserveOnlineLabel": "Reserve Online"},
)

schema_sql = """-- =============================================================================
-- Page content CMS (location-scoped JSON sections)
-- Keeps homepage_content unchanged; new copy lives here.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL CHECK (location_id IN
    ('south-plainfield', 'oak-tree', 'lawrenceville')),
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (location_id, page, section)
);

CREATE INDEX IF NOT EXISTS page_content_location_page_idx
  ON public.page_content (location_id, page);

CREATE OR REPLACE FUNCTION public.set_page_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS page_content_set_updated_at ON public.page_content;
CREATE TRIGGER page_content_set_updated_at
  BEFORE UPDATE ON public.page_content
  FOR EACH ROW
  EXECUTE FUNCTION public.set_page_content_updated_at();

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_content_public_read"
  ON public.page_content FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "page_content_authenticated_all"
  ON public.page_content FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT ON public.page_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.page_content TO authenticated;
"""

values = []
for page, section, content in sections:
    j = json.dumps(content, ensure_ascii=False).replace("'", "''")
    values.append(f"    ('{page}', '{section}', '{j}'::jsonb)")

seed_sql = f"""
-- Seed current hardcoded copy for all locations (identical starting content)
WITH locations AS (
  SELECT unnest(ARRAY['south-plainfield', 'oak-tree', 'lawrenceville']::text[]) AS location_id
),
seed_sections AS (
  SELECT * FROM (VALUES
{",\n".join(values)}
  ) AS t(page, section, content)
)
INSERT INTO public.page_content (location_id, page, section, content)
SELECT l.location_id, s.page, s.section, s.content
FROM locations l
CROSS JOIN seed_sections s
ON CONFLICT (location_id, page, section) DO NOTHING;
"""

out = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "024_page_content.sql"
out.write_text(schema_sql + seed_sql, encoding="utf-8")
print(f"Wrote {out} ({len(sections)} sections x 3 locations = {len(sections) * 3} rows)")
