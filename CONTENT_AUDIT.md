# Content Audit — Public Website Text

Phase 1 audit of all rendered text across public pages. Columns: **section**, **CMS-editable today?**, **source**.

**Already covered elsewhere (not duplicated in `page_content` seed):**
- `restaurant_settings`: address, phone, email, opening_hours, google_maps, facebook, instagram, youtube, logo, restaurant_name, order_url, reservation_url, seo_*
- `homepage_content`: hero_title, hero_subtitle, hero_image, hero_video, cta_text, about_title, about_description
- `gallery`: images, alt_text, title, caption (by section key)
- `menu_categories` / `menu_items`: category names, item name/description/price/badges
- `offers`: title, description, badge, image, slug
- `reviews`: customer_name, review, rating (source label "Google Review" is hardcoded)

---

## Global — Navbar & Footer

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Nav link labels (Home, About, Menu, …) | No | hardcoded — `src/constants/navigation.ts` → `NAV_LINKS` |
| "Order Now" button label | No | hardcoded — `src/components/layout/Navbar.tsx` |
| "Order Now" link | Yes | `restaurant_settings.order_url` |
| "Reserve a Table" button label | No | hardcoded — `Navbar.tsx` |
| "Reserve a Table" link | Yes | `restaurant_settings.reservation_url` |
| Logo alt text | Partial | derived from `restaurant_settings.restaurant_name` |
| Location switcher names | No | hardcoded — `src/config/locations.ts` |
| Footer pre-CTA eyebrow "Ready to dine?" | No | hardcoded — `Footer.tsx` |
| Footer pre-CTA title | No | hardcoded — `Footer.tsx` |
| Footer "Order Now" / "Reserve a Table" labels | No | hardcoded — `Footer.tsx` |
| Footer tagline "Authentic Indian Restaurant" | No | hardcoded — `Footer.tsx` |
| Footer selected location name | No | hardcoded — `config/locations.ts` |
| Footer address snippet | Yes | `restaurant_settings.address` |
| Footer brand blurb ("since 2018…") | No | hardcoded — `Footer.tsx` |
| Quick Links heading + link labels | No | hardcoded — `Footer.tsx`, `FOOTER_LINKS` |
| Opening Hours day labels (Mon–Thu, etc.) | No | hardcoded — `formatOpeningHoursRows()` in `homepagePublic.ts` |
| Opening Hours times | Yes | `restaurant_settings.opening_hours` |
| Contact address/phone/email | Yes | `restaurant_settings` |
| "Get in Touch" link label | No | hardcoded — `Footer.tsx` |
| Copyright / restaurant name | Yes | `restaurant_settings.restaurant_name` |
| Privacy Policy / Terms of Service | No | hardcoded — `Footer.tsx` |

---

## Home — `src/pages/HomePage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero title | Yes | `homepage_content.hero_title` |
| Hero subtitle | Yes | `homepage_content.hero_subtitle` |
| Hero video / poster | Yes | `homepage_content.hero_video` / `gallery.hero_background` or `homepage_content.hero_image` |
| Logo | Yes | `restaurant_settings.logo` |
| Hero scroll hint "Scroll" | No | hardcoded — `src/components/Hero.tsx` |
| Entrance kicker "A warm welcome" | No | hardcoded — `EntranceImageSequence.tsx` |
| Entrance headline | No | hardcoded — `EntranceImageSequence.tsx` |
| Experience eyebrow "Discover {name}" | Partial | name from `restaurant_settings.restaurant_name`; template hardcoded |
| Experience title "Choose Your Experience" | No | hardcoded — `ExperienceCards.tsx` |
| Experience section subtitle | No | hardcoded — `ExperienceCards.tsx` |
| Menu card (label, headline, subtitle, CTA) | No | hardcoded — `ExperienceCards.tsx` |
| Menu card image | Yes | `gallery.choose_experience_menu` |
| Order card copy | No | hardcoded — `ExperienceCards.tsx` |
| Order button label | Yes | `homepage_content.cta_text` |
| Order button link | Yes | `restaurant_settings.order_url` |
| Order card image | Yes | `gallery.choose_experience_order` |
| Reservations card copy | Partial | subtitle uses `restaurant_settings.address`; rest hardcoded |
| Reservations meta (hours, phone, email, social) | Yes | `restaurant_settings` |
| Reservations card image | Yes | `gallery.choose_experience_visit` |
| "Reserve a Table" CTA | No | hardcoded — `ExperienceCards.tsx` |
| Ticker marquee (5 promos) | No | hardcoded — `TICKER_ITEMS` in `ExperienceCards.tsx` |
| Signature eyebrow / title / subtitle | No | hardcoded — `SignatureCarousel.tsx` |
| Signature dish cards | Yes* | `menu_items` (chef_special/popular); fallback `signatureDishes.ts` |
| "View Full Menu" CTA | No | hardcoded — `SignatureCarousel.tsx` |
| Signature feature row (4 items) | No | hardcoded — `SIGNATURE_FEATURES` in `signatureDishes.ts` |
| About eyebrow "Our Story" | No | hardcoded — `AboutSection.tsx` |
| About title | Yes | `homepage_content.about_title` |
| About lead paragraph | Yes | `homepage_content.about_description` |
| About body paragraphs (×3) | No | hardcoded — `ABOUT_PARAGRAPHS` in `aboutSection.ts` |
| About blockquote | No | hardcoded — `ABOUT_QUOTE` in `aboutSection.ts` |
| About feature list (4 items) | No | hardcoded — `ABOUT_FEATURES` in `aboutSection.ts` |
| "Our Story" button | No | hardcoded — `StoryButton.tsx` → `/about` |
| About food/interior images | Yes | `gallery.home_about_food`, `home_about_interior` |
| Catering scroll overlay (label, title, desc, CTA) | No | hardcoded — `CATERING_OVERLAY` in `cateringSequence.ts` |
| Ambience eyebrow "{name} Experience" | Partial | name from settings; template hardcoded |
| Ambience title / subtitle | No | hardcoded — `ExperienceSection.tsx` |
| Ambience gallery card title/subtitle | Partial | `gallery.ambience` title/caption; fallback `atmosphereGallery.ts` |
| Ambience feature row (5 items) | No | hardcoded — `EXPERIENCE_FEATURES` |
| Announcement ribbon (4 items) | No | hardcoded — `RIBBON_ANNOUNCEMENTS` |

---

## About — `src/pages/AboutPage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero label / title / subtitle | No | hardcoded — `AboutPage.tsx` |
| Breadcrumbs | No | hardcoded — `PageHero` props |
| Hero background | Yes | `gallery.about_hero` |
| Mission eyebrow / title / subtitle | No | hardcoded — `AboutPage.tsx` |
| Mission image | Yes | `gallery.about_tradition` |
| Philosophy section copy | No | hardcoded — `AboutPage.tsx` |
| Pillar cards (×3) | No | hardcoded — `PILLARS` array |
| Cuisine section copy | No | hardcoded — `AboutPage.tsx` |
| Cuisine image | Yes | `gallery.about_flavours` |
| Chef section copy | No | hardcoded — `AboutPage.tsx` |
| Chef image | Yes | `gallery.about_crafted` |
| Timeline (4 milestones) | No | hardcoded — `TIMELINE` array |
| Bottom gallery images | Yes | `gallery.about_journey` (alt only) |
| CTA title / subtitle / button | No | hardcoded — `CTASection` props |

---

## Menu — `src/pages/MenuPage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero label / title | No | hardcoded — `MenuPage.tsx` |
| Hero subtitle (location suffix) | Partial | template hardcoded; `{location}` from `config/locations.ts` |
| Hero background | Yes | `gallery.menu_hero` |
| Search placeholder | No | hardcoded — `SearchBar.tsx` |
| Filter "All Categories" | No | hardcoded — `FilterDropdown.tsx` |
| Category tab / section names | Yes | `menu_categories.name` |
| Category editorial subtitles | No | hardcoded — `getCategorySubtitle()` in `utils/menu.ts` |
| Menu item name / description / price | Yes | `menu_items` |
| "Chef's Special" badge | Yes | `menu_items.chef_special` / `popular` |
| Empty / error states | No | hardcoded — `MenuPage.tsx` |
| Bottom CTA | No | hardcoded — `MenuPage.tsx` |

---

## Offers — `src/pages/OffersPage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero eyebrow / title / subtitle | No | hardcoded — `OffersPage.tsx` |
| Hero background | Yes | `gallery.offers_hero` |
| Location picker heading / subtitle | No | hardcoded — `OffersLocationPicker.tsx` |
| Location names / addresses | No | hardcoded — `config/locations.ts` |
| "Viewing Offers" badge | No | hardcoded — `OffersLocationPicker.tsx` |
| Offer card title / description / badge | Yes | `offers` table |
| "View Details" / "Order Now" | No | hardcoded — `OffersGrid.tsx` |
| Empty state copy | No | hardcoded — `OffersGrid.tsx` |

---

## Catering — `src/pages/CateringPage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero label / title / subtitle | No | hardcoded — `CateringPage.tsx` |
| Hero background | Yes | `gallery.catering_hero` |
| Section eyebrow / title / subtitle | No | hardcoded — `CateringPage.tsx` |
| Service blocks (×5: tag, title, text) | No | hardcoded — `SERVICES` array |
| Service images | Yes | `gallery.catering_*` sections |
| CTA title / subtitle / button | No | hardcoded — `CateringPage.tsx` |

---

## Parties — `src/pages/PartiesPage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero label / title / subtitle | No | hardcoded — `PartiesPage.tsx` |
| Hero background | Yes | `gallery.parties_hero` |
| Events section eyebrow / title / subtitle | No | hardcoded — `PartiesPage.tsx` |
| Event cards (×6) | No | hardcoded — `EVENTS` array |
| Gallery eyebrow / title | No | hardcoded — `PartiesPage.tsx` |
| Gallery images | Yes | `gallery.parties_gallery` |
| CTA title / subtitle / button | No | hardcoded — `PartiesPage.tsx` |

---

## Testimonials — `src/pages/TestimonialsPage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero label / title / subtitle | No | hardcoded — `TestimonialsPage.tsx` |
| Hero background | Yes | `gallery.testimonials_hero` |
| "Average Rating" label | No | hardcoded — `TestimonialsPage.tsx` |
| Rating value "4.9" | No | hardcoded — `TestimonialsPage.tsx` |
| "Based on 500+ Google Reviews" | No | hardcoded — `TestimonialsPage.tsx` |
| "Google Verified" badge | No | hardcoded — `TestimonialsPage.tsx` |
| Featured / grid review quote & name | Yes | `reviews.customer_name`, `reviews.review`, `reviews.rating` |
| Review source label | No | hardcoded — `reviewsPublic.ts` → "Google Review" |
| "All Reviews" section heading | No | hardcoded — `TestimonialsPage.tsx` |
| Empty / loading states | No | hardcoded — `TestimonialsPage.tsx` |
| CTA title / subtitle / button | No | hardcoded — `TestimonialsPage.tsx` |

---

## Contact — `src/pages/ContactPage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero label / title | No | hardcoded — `ContactPage.tsx` |
| Hero subtitle (location suffix) | Partial | template hardcoded; location from `config/locations.ts` |
| Hero background | Yes | `gallery.contact_hero` |
| Section eyebrow / title / subtitle | No | hardcoded — `ContactPage.tsx` |
| Address / phone / email / hours values | Yes | `restaurant_settings` |
| Hours day labels | No | hardcoded — `formatOpeningHoursRows()` |
| Field labels (Address, Phone, Email, Business Hours) | No | hardcoded — `ContactPage.tsx` |
| Form heading "Send a message" | No | hardcoded — `ContactPage.tsx` |
| Form labels / placeholders | No | hardcoded — `ContactPage.tsx` |
| "Send Message" / "Sending…" | No | hardcoded — `ContactPage.tsx` |
| Validation errors | No | hardcoded — `useContactForm.ts` |
| Success message | No | hardcoded — `contactApi.ts` |
| "Send another message" | No | hardcoded — `ContactPage.tsx` |
| Map iframe | Yes | `restaurant_settings.google_maps` |
| Bottom CTA copy | No | hardcoded — `ContactPage.tsx` |
| Bottom CTA button label / link | Partial | label hardcoded; link from `restaurant_settings.reservation_url` |

---

## Reservation — `src/pages/ReservationPage.tsx`

| Section | CMS-editable? | Table/field or hardcoded |
|---|---|---|
| Hero label / title | No | hardcoded — `ReservationPage.tsx` |
| Hero subtitle (location suffix) | Partial | template hardcoded; location from `config/locations.ts` |
| Hero background | No | hardcoded — `/reservation/interior/interior-01.png` |
| Stats cards (Google Rating, 300+ Dishes, etc.) | No | hardcoded — `RESERVATION_STATS` in `reservationPage.ts` |
| Interior slideshow images / alt | No | hardcoded — `RESERVATION_INTERIOR_SLIDES` |
| Form step / title / subtitle | No | hardcoded — `BookingForm.tsx` |
| Form field labels / placeholders | No | hardcoded — `BookingForm.tsx` |
| Location dropdown options | No | hardcoded — `RESERVATION_LOCATIONS` |
| Time slot messages | No | hardcoded — `BookingForm.tsx` |
| Submit / success labels & messages | No | hardcoded — `BookingForm.tsx`, `reservationApi.ts` |
| "Why Reserve" section copy | No | hardcoded — `FeatureCards.tsx`, `RESERVATION_FEATURES` |
| Gallery section copy + labels | No | hardcoded — `ImageGallery.tsx`, `RESERVATION_GALLERY` |
| Contact section headings | No | hardcoded — `ContactCards.tsx` |
| Contact card titles (Call Us, Email, …) | No | hardcoded — `buildReservationContactCards()` |
| Contact card values (phone, email, address, hours) | Yes | `restaurant_settings` |
| Map title / subtitle | Partial | title hardcoded; subtitle = `restaurant_settings.address` |
| Sticky CTA labels | Partial | labels hardcoded; external link from `restaurant_settings.reservation_url` |

---

## Summary

| Coverage | Count (approx.) |
|---|---|
| Already CMS-backed (settings, homepage_content, gallery media, menu, offers, reviews) | ~35 sections |
| Hardcoded text targeted for `page_content` (Phase 2) | ~90 sections |
| Partial (template + dynamic value from settings/locations) | ~15 sections |

**Notable gaps today:** About/Catering/Parties/Offers/Testimonials page prose is entirely hardcoded; reservation page is almost entirely hardcoded; navbar/footer nav labels and taglines are hardcoded; category editorial subtitles live in code; testimonials aggregate stats (4.9, 500+) are hardcoded; `homepage_content.cta_link` is admin-editable but unused on the live homepage (order link comes from `restaurant_settings.order_url`).
