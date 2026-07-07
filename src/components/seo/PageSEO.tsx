import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { PAGE_SEO } from "../../constants/seo";
import { SITE } from "../../constants/site";
import { getSiteUrl } from "../../config/env";
import { resolveSeoPageKeyFromPath } from "../../config/seoPages";
import { isLocationId } from "../../config/locations";
import { useHomepageData } from "../../hooks/useHomepageData";
import { useSeoMetadata } from "../../hooks/useSeoMetadata";
import { buildRestaurantJsonLd } from "../../services/homepagePublic";
import { resolveEffectiveJsonLd } from "../../utils/seo/schemaGenerator";
import { removeMeta, upsertMeta } from "../../utils/seo/domMeta";

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function faviconMimeType(url: string): string | null {
  const clean = url.split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".ico")) return "image/x-icon";
  if (clean.endsWith(".svg")) return "image/svg+xml";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  return null;
}

/** Like upsertLink, but also fixes/clears `type` so a stale hint (e.g. the
 *  static index.html tag says image/png) doesn't make browsers reject an
 *  uploaded favicon of a different format. */
function applyFaviconLinks(href: string) {
  const rels = ["icon", "apple-touch-icon"] as const;

  for (const rel of rels) {
    const existing = document.querySelectorAll(`link[rel="${rel}"]`);
    existing.forEach((node, index) => {
      if (index > 0) node.remove();
    });

    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }

    el.setAttribute("href", href);
    const mime = faviconMimeType(href);
    if (mime) {
      el.setAttribute("type", mime);
    } else {
      el.removeAttribute("type");
    }
  }
}

const JSON_LD_ID = "desi-dhamaka-jsonld";

function relativePath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";
  return `/${segments.slice(1).join("/")}`;
}

export default function PageSEO() {
  const { pathname } = useLocation();
  const params = useParams();
  const { bundle } = useHomepageData();
  const { settings } = bundle;
  const relPath = relativePath(pathname);
  const baseConfig = PAGE_SEO[relPath] ?? PAGE_SEO["/404"];
  const pageKey = resolveSeoPageKeyFromPath(relPath);
  const locationParam = params.locationId;
  const locationId = locationParam && isLocationId(locationParam) ? locationParam : null;
  const { form: seoForm } = useSeoMetadata(locationId ?? "south-plainfield", locationId ? pageKey : null);

  const config = useMemo(() => {
    if (seoForm) {
      return {
        title: seoForm.basic.seoTitle.trim() || baseConfig.title,
        description: seoForm.basic.metaDescription.trim() || baseConfig.description,
        path: baseConfig.path,
        keywords: [seoForm.basic.focusKeyword, seoForm.basic.secondaryKeywords]
          .filter(Boolean)
          .join(", "),
        ogTitle: seoForm.openGraph.ogTitle.trim() || seoForm.basic.seoTitle.trim() || baseConfig.title,
        ogDescription:
          seoForm.openGraph.ogDescription.trim() ||
          seoForm.basic.metaDescription.trim() ||
          baseConfig.description,
        ogImage: seoForm.openGraph.ogImage.trim() || seoForm.twitter.twitterImage.trim(),
        ogType: seoForm.openGraph.ogType.trim() || "website",
        twitterTitle: seoForm.twitter.twitterTitle.trim() || seoForm.basic.seoTitle.trim() || baseConfig.title,
        twitterDescription:
          seoForm.twitter.twitterDescription.trim() ||
          seoForm.basic.metaDescription.trim() ||
          baseConfig.description,
        twitterImage: seoForm.twitter.twitterImage.trim() || seoForm.openGraph.ogImage.trim(),
        twitterCard: seoForm.twitter.twitterCardType,
        robotsIndex: seoForm.basic.robotsIndex !== "noindex" && !seoForm.advanced.noIndex,
        canonicalOverride: seoForm.basic.canonicalUrl.trim() || seoForm.advanced.canonicalUrl.trim(),
      };
    }

    const isHome = relPath === "/";
    return {
      title: isHome && settings.seo_title.trim() ? settings.seo_title.trim() : baseConfig.title,
      description:
        isHome && settings.seo_description.trim()
          ? settings.seo_description.trim()
          : baseConfig.description,
      path: baseConfig.path,
      keywords: isHome ? settings.seo_keywords.trim() : "",
      ogTitle: isHome && settings.seo_title.trim() ? settings.seo_title.trim() : baseConfig.title,
      ogDescription:
        isHome && settings.seo_description.trim()
          ? settings.seo_description.trim()
          : baseConfig.description,
      ogImage: "",
      ogType: "website",
      twitterTitle: isHome && settings.seo_title.trim() ? settings.seo_title.trim() : baseConfig.title,
      twitterDescription:
        isHome && settings.seo_description.trim()
          ? settings.seo_description.trim()
          : baseConfig.description,
      twitterImage: "",
      twitterCard: "summary_large_image" as const,
      robotsIndex: true,
      canonicalOverride: "",
    };
  }, [baseConfig, relPath, seoForm, settings.seo_description, settings.seo_keywords, settings.seo_title]);

  const siteUrl = getSiteUrl();
  const canonical = config.canonicalOverride || `${siteUrl}${pathname === "/" ? "" : pathname}`;
  const image = config.ogImage ? config.ogImage : `${siteUrl}${config.path === "/" ? SITE.ogImage : SITE.ogImage}`;

  useEffect(() => {
    document.title = config.title;

    upsertMeta("description", config.description);
    upsertLink("canonical", canonical);

    if (config.keywords) {
      upsertMeta("keywords", config.keywords);
    } else {
      removeMeta("keywords");
    }

    if (config.robotsIndex) {
      removeMeta("robots");
    } else {
      upsertMeta("robots", "noindex, nofollow");
    }

    const favicon = settings.favicon?.trim();
    if (favicon) {
      applyFaviconLinks(favicon);
    }

    upsertMeta("og:title", config.ogTitle, "property");
    upsertMeta("og:description", config.ogDescription, "property");
    upsertMeta("og:url", canonical, "property");
    upsertMeta("og:type", config.ogType, "property");
    upsertMeta("og:image", image, "property");
    upsertMeta("og:site_name", settings.restaurant_name, "property");

    upsertMeta("twitter:card", config.twitterCard);
    upsertMeta("twitter:title", config.twitterTitle);
    upsertMeta("twitter:description", config.twitterDescription);
    upsertMeta("twitter:image", config.twitterImage || image);

    let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = JSON_LD_ID;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    if (seoForm && locationId && pageKey) {
      script.textContent = resolveEffectiveJsonLd(seoForm, locationId, pageKey);
    } else {
      script.textContent = JSON.stringify(buildRestaurantJsonLd(settings, config.path));
    }
  }, [
    canonical,
    config.description,
    config.keywords,
    config.ogDescription,
    config.ogTitle,
    config.ogType,
    config.path,
    config.robotsIndex,
    config.title,
    config.twitterCard,
    config.twitterDescription,
    config.twitterImage,
    config.twitterTitle,
    image,
    locationId,
    pageKey,
    seoForm,
    settings,
    settings.favicon,
  ]);

  return null;
}
