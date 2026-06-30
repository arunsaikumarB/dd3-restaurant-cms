import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PAGE_SEO } from "../../constants/seo";
import { SITE } from "../../constants/site";
import { getSiteUrl } from "../../config/env";
import { useHomepageData } from "../../hooks/useHomepageData";
import { buildRestaurantJsonLd } from "../../services/homepagePublic";

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

const JSON_LD_ID = "desi-dhamaka-jsonld";

export default function PageSEO() {
  const { pathname } = useLocation();
  const { bundle } = useHomepageData();
  const { settings } = bundle;
  const config = PAGE_SEO[pathname] ?? PAGE_SEO["/404"];
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}${config.path === "/" ? "" : config.path}`;
  const image = `${siteUrl}${config.image ?? SITE.ogImage}`;

  useEffect(() => {
    document.title = config.title;

    upsertMeta("description", config.description);
    upsertLink("canonical", canonical);

    upsertMeta("og:title", config.title, "property");
    upsertMeta("og:description", config.description, "property");
    upsertMeta("og:url", canonical, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:image", image, "property");
    upsertMeta("og:site_name", settings.restaurant_name, "property");

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
    script.textContent = JSON.stringify(buildRestaurantJsonLd(settings, config.path));
  }, [
    config.title,
    config.description,
    config.path,
    canonical,
    image,
    siteUrl,
    settings.restaurant_name,
    settings.phone,
    settings.email,
    settings.address,
    settings.logo,
    settings.opening_hours.weekday,
    settings.opening_hours.weekend,
    settings.opening_hours.sunday,
  ]);

  return null;
}
