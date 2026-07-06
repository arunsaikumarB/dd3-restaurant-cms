import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminButton from "../ui/Button";
import AdminCard from "../ui/Card";
import HomepagePageSkeleton from "../settings/HomepagePageSkeleton";
import SeoEditorPanel from "./SeoEditorPanel";
import SeoValidationAlerts from "./SeoValidationAlerts";
import {
  SEO_PAGE_TAB_SECTIONS,
  type SeoEditorSectionKey,
  type SeoEditorSectionTab,
} from "../../config/seoPages";
import { useAdminTheme } from "../../context/AdminThemeContext";
import { useLocation } from "../../hooks/useLocation";
import { getLocationConfig } from "../../../config/locations";
import { getSiteUrl } from "../../../config/env";
import { getSeoPagePath } from "../../../config/seoPages";
import {
  getOrCreateSeoMetadata,
  getSeoMetadataForLocation,
  updateSeoMetadata,
} from "../../../services/seoMetadata";
import type { SeoMetadataForm, SeoPageKey } from "../../../types/seoMetadata";
import {
  hasBlockingSeoErrors,
  validateDuplicateSeoAcrossPages,
  validateJsonLd,
  validateSeoMetadataForm,
} from "../../../utils/validation/seoMetadata";
import { resolveEffectiveJsonLd } from "../../../utils/seo/schemaGenerator";

type PageSeoPanelProps = {
  pageKey: SeoPageKey;
  onToast: (message: string, variant?: "success" | "error") => void;
  sections?: SeoEditorSectionTab[];
};

export default function PageSeoPanel({ pageKey, onToast, sections = SEO_PAGE_TAB_SECTIONS }: PageSeoPanelProps) {
  const { dark } = useAdminTheme();
  const { locationId, isAllLocations, scope } = useLocation();
  const [activeSection, setActiveSection] = useState<SeoEditorSectionKey>(
    sections[0]?.key ?? "basic",
  );
  const [recordId, setRecordId] = useState<string | null>(null);
  const [form, setForm] = useState<SeoMetadataForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const savedFormRef = useRef<SeoMetadataForm | null>(null);

  const loadSeo = useCallback(async () => {
    if (isAllLocations) {
      setLoading(false);
      setLoadError(null);
      setForm(null);
      setRecordId(null);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const row = await getOrCreateSeoMetadata(locationId, pageKey);
      setRecordId(row.id);
      setForm(row.data);
      savedFormRef.current = row.data;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load SEO metadata.");
    } finally {
      setLoading(false);
    }
  }, [isAllLocations, locationId, pageKey]);

  useEffect(() => {
    void loadSeo();
  }, [loadSeo, scope]);

  useEffect(() => {
    if (!sections.some((section) => section.key === activeSection)) {
      setActiveSection(sections[0]?.key ?? "basic");
    }
  }, [activeSection, sections]);

  const validationIssues = useMemo(() => {
    if (!form) return [];
    const pageValidation = validateSeoMetadataForm(form);
    const jsonIssues = validateJsonLd(resolveEffectiveJsonLd(form, locationId, pageKey));
    return [...pageValidation.issues, ...jsonIssues];
  }, [form, locationId, pageKey]);

  const handleSave = async () => {
    if (!form || !recordId || saving || isAllLocations) return;

    const jsonLd = resolveEffectiveJsonLd(form, locationId, pageKey);
    const jsonIssues = validateJsonLd(jsonLd);
    if (hasBlockingSeoErrors(jsonIssues)) {
      onToast("Schema JSON-LD is invalid. Fix JSON before saving.", "error");
      return;
    }

    const nextForm: SeoMetadataForm = {
      ...form,
      schema: {
        ...form.schema,
        jsonLd: form.schema.autoGenerate ? jsonLd : form.schema.jsonLd,
      },
    };

    setSaving(true);
    try {
      const siblings = await getSeoMetadataForLocation(locationId);
      const duplicateIssues = validateDuplicateSeoAcrossPages(
        siblings.map((row) => ({
          pageKey: row.page_key,
          form: row.page_key === pageKey ? nextForm : row.data,
        })),
      );

      const updated = await updateSeoMetadata(recordId, locationId, pageKey, nextForm);
      setForm(updated.data);
      savedFormRef.current = updated.data;

      if (duplicateIssues.length > 0) {
        onToast(`Saved. Warning: ${duplicateIssues[0]?.message ?? "Duplicate SEO detected."}`);
      } else {
        onToast("SEO metadata saved successfully.");
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to save SEO metadata.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (savedFormRef.current) {
      setForm(JSON.parse(JSON.stringify(savedFormRef.current)) as SeoMetadataForm);
    }
  };

  if (loading) {
    return <HomepagePageSkeleton />;
  }

  if (isAllLocations) {
    return (
      <AdminCard>
        <p className="text-sm text-admin-muted">
          Select a single location in the header to edit SEO metadata for that branch.
        </p>
      </AdminCard>
    );
  }

  if (loadError || !form) {
    return (
      <AdminCard>
        <p className="text-sm text-admin-danger">{loadError ?? "Unable to load SEO metadata."}</p>
        <div className="mt-4">
          <AdminButton type="button" onClick={() => void loadSeo()}>
            Retry
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  const locationLabel = getLocationConfig(locationId).shortName;
  const previewUrl = `${getSiteUrl()}/${locationId}${getSeoPagePath(pageKey)}`.replace(/\/+$/, "");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-admin-muted">
          Preview URL: <span className="font-mono">{previewUrl}</span> · Editing SEO for {locationLabel}
        </div>
        <div className="flex gap-2">
          <AdminButton type="button" variant="outline" onClick={handleReset} disabled={saving}>
            Reset
          </AdminButton>
          <AdminButton type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving..." : "Save SEO"}
          </AdminButton>
        </div>
      </div>

      <SeoValidationAlerts issues={validationIssues} />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <AdminCard padding="sm">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={[
                  "w-full rounded-xl px-4 py-3 text-left text-sm transition-colors",
                  activeSection === section.key
                    ? "bg-admin-primary text-white"
                    : dark
                      ? "hover:bg-white/5"
                      : "hover:bg-admin-ivory",
                ].join(" ")}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </AdminCard>

        <SeoEditorPanel
          form={form}
          pageKey={pageKey}
          locationId={locationId}
          activeSection={activeSection}
          saving={saving}
          onChange={setForm}
        />
      </div>
    </div>
  );
}
