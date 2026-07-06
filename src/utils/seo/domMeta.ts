/** Shared helpers for imperatively managing <head> meta/link tags outside React's
 *  render tree (this SPA has no <Helmet>-style component, so pages that need
 *  their own tags — e.g. PageSEO, LocationGatePage — upsert them directly). */

export function upsertMeta(
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

export function removeMeta(key: string, attr: "name" | "property" = "name") {
  const el = document.querySelector(`meta[${attr}="${key}"]`);
  el?.remove();
}
