import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PAGE_SEO } from "../../constants/seo";
import { SITE } from "../../constants/site";

function upsertMeta(
  key: string,
  content: string,
  attr: "name" | "property" = "name",
) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function buildRestaurantJsonLd(path: string) {
  const pageUrl = `${SITE.url}${path === "/" ? "" : path}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: SITE.name,
      description:
        "Authentic Indian restaurant in Lawrenceville, NJ specializing in Andhra and Hyderabadi cuisine.",
      url: SITE.url,
      telephone: SITE.phone,
      email: SITE.email,
      image: `${SITE.url}${SITE.ogImage}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "540 Lawrence Square Blvd S",
        addressLocality: SITE.city,
        addressRegion: SITE.state,
        postalCode: SITE.postalCode,
        addressCountry: SITE.country,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: SITE.geo.latitude,
        longitude: SITE.geo.longitude,
      },
      servesCuisine: ["Indian", "Andhra", "Hyderabadi"],
      priceRange: "$$",
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
          opens: "11:00",
          closes: "22:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Friday", "Saturday"],
          opens: "11:00",
          closes: "23:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Sunday",
          opens: "12:00",
          closes: "21:30",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: SITE.name,
      url: pageUrl,
      telephone: SITE.phone,
      email: SITE.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: "540 Lawrence Square Blvd S",
        addressLocality: SITE.city,
        addressRegion: SITE.state,
        postalCode: SITE.postalCode,
        addressCountry: SITE.country,
      },
    },
  ];
}

const JSON_LD_ID = "desi-dhamaka-jsonld";

export default function PageSEO() {
  const { pathname } = useLocation();
  const config = PAGE_SEO[pathname] ?? PAGE_SEO["/404"];
  const canonical = `${SITE.url}${config.path === "/" ? "" : config.path}`;
  const image = `${SITE.url}${config.image ?? SITE.ogImage}`;

  useEffect(() => {
    document.title = config.title;

    upsertMeta("description", config.description);
    upsertLink("canonical", canonical);

    upsertMeta("og:title", config.title, "property");
    upsertMeta("og:description", config.description, "property");
    upsertMeta("og:url", canonical, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:image", image, "property");
    upsertMeta("og:site_name", SITE.name, "property");

    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", config.title);
    upsertMeta("twitter:description", config.description);
    upsertMeta("twitter:image", image);

    let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = JSON_LD_ID;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(buildRestaurantJsonLd(config.path));
  }, [config.title, config.description, config.path, canonical, image]);

  return null;
}
