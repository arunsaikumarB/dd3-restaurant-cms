import type { SeoMetadataForm, SeoValidationIssue, SeoValidationResult } from "../../types/seoMetadata";

function warn(id: string, message: string, field?: string): SeoValidationIssue {
  return { id, severity: "warning", message, field };
}

function error(id: string, message: string, field?: string): SeoValidationIssue {
  return { id, severity: "error", message, field };
}

export function validateHeadingHierarchy(form: SeoMetadataForm): SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
  const h1 = form.headings.h1.trim();
  const h2Values = form.headings.h2.map((v) => v.trim()).filter(Boolean);
  const h3Values = form.headings.h3.map((v) => v.trim()).filter(Boolean);

  if (!h1) {
    issues.push(warn("heading-missing-h1", "H1 is missing for this page.", "headings.h1"));
  }

  const duplicateH1 = h2Values.filter((value) => value.toLowerCase() === h1.toLowerCase());
  if (h1 && duplicateH1.length > 0) {
    issues.push(warn("heading-duplicate-h1", "Duplicate H1 detected in H2 headings.", "headings.h2"));
  }

  if (h3Values.length > 0 && h2Values.length === 0) {
    issues.push(
      warn(
        "heading-hierarchy-broken",
        "H3 headings exist without any H2 — heading hierarchy may be broken.",
        "headings.h3",
      ),
    );
  }

  return issues;
}

export function validateSeoMetadataForm(form: SeoMetadataForm): SeoValidationResult {
  const issues: SeoValidationIssue[] = [];
  const title = form.basic.seoTitle.trim();
  const description = form.basic.metaDescription.trim();

  if (title.length > 60) {
    issues.push(warn("title-length", `SEO title is ${title.length} characters (recommended max 60).`, "basic.seoTitle"));
  }
  if (description.length > 160) {
    issues.push(
      warn(
        "description-length",
        `Meta description is ${description.length} characters (recommended max 160).`,
        "basic.metaDescription",
      ),
    );
  }
  if (!form.basic.canonicalUrl.trim() && !form.advanced.canonicalUrl.trim()) {
    issues.push(warn("canonical-missing", "Canonical URL is missing.", "basic.canonicalUrl"));
  }
  if (!form.openGraph.ogImage.trim() && !form.twitter.twitterImage.trim()) {
    issues.push(warn("og-image-missing", "OG / social image is missing.", "openGraph.ogImage"));
  }
  if (!form.schema.jsonLd.trim() && form.schema.schemaTypes.length === 0) {
    issues.push(warn("schema-missing", "Schema markup is not configured.", "schema.jsonLd"));
  }
  if (form.faqs.filter((faq) => faq.status === "active" && faq.question.trim()).length === 0) {
    issues.push(warn("faq-missing", "No active FAQs configured for FAQ schema.", "faqs"));
  }
  if (!form.imageSeo.defaultAltText.trim()) {
    issues.push(warn("alt-missing", "Default image ALT text is missing.", "imageSeo.defaultAltText"));
  }

  const headingIssues = validateHeadingHierarchy(form);
  return { issues: [...issues, ...headingIssues], headingIssues };
}

export function validateDuplicateSeoAcrossPages(
  forms: Array<{ pageKey: string; form: SeoMetadataForm }>,
): SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
  const titleMap = new Map<string, string[]>();
  const descriptionMap = new Map<string, string[]>();

  for (const entry of forms) {
    const title = entry.form.basic.seoTitle.trim().toLowerCase();
    const description = entry.form.basic.metaDescription.trim().toLowerCase();
    if (title) {
      const pages = titleMap.get(title) ?? [];
      pages.push(entry.pageKey);
      titleMap.set(title, pages);
    }
    if (description) {
      const pages = descriptionMap.get(description) ?? [];
      pages.push(entry.pageKey);
      descriptionMap.set(description, pages);
    }
  }

  for (const [title, pages] of titleMap) {
    if (pages.length > 1) {
      issues.push(warn("duplicate-title", `Duplicate SEO title "${title}" on: ${pages.join(", ")}.`));
    }
  }
  for (const [, pages] of descriptionMap) {
    if (pages.length > 1) {
      issues.push(
        warn("duplicate-description", `Duplicate meta description on: ${pages.join(", ")}.`),
      );
    }
  }

  return issues;
}

export function validateJsonLd(jsonLd: string): SeoValidationIssue[] {
  const trimmed = jsonLd.trim();
  if (!trimmed) return [];

  try {
    JSON.parse(trimmed);
    return [];
  } catch {
    return [error("schema-invalid-json", "Schema JSON-LD is not valid JSON.", "schema.jsonLd")];
  }
}

export function hasBlockingSeoErrors(issues: SeoValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}
