import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import SeoEditorPanel from "../components/seo/SeoEditorPanel";
import SeoValidationAlerts from "../components/seo/SeoValidationAlerts";
import AdminButton from "../components/ui/Button";
import AdminCard from "../components/ui/Card";
import AdminToast from "../components/ui/Toast";
import { SEO_EDITOR_SECTIONS, SEO_PAGE_TABS, type SeoEditorSectionKey } from "../config/seoPages";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import HomepagePageSkeleton from "../components/settings/HomepagePageSkeleton";
import { getLocationConfig } from "../../config/locations";
import { getSiteUrl } from "../../config/env";
import { getSeoPagePath } from "../../config/seoPages";
import {
  getOrCreateSeoMetadata,
  getSeoMetadataForLocation,
  updateSeoMetadata,
} from "../../services/seoMetadata";
import type { SeoMetadataForm, SeoPageKey } from "../../types/seoMetadata";
import {
  hasBlockingSeoErrors,
  validateDuplicateSeoAcrossPages,
  validateJsonLd,
  validateSeoMetadataForm,
} from "../../utils/validation/seoMetadata";
import { resolveEffectiveJsonLd } from "../../utils/seo/schemaGenerator";

export default function SeoPage() {
  const { dark } = useAdminTheme();
  const { locationId, isAllLocations, scope } = useLocation();
  const [activePage, setActivePage] = useState<SeoPageKey>("homepage");
  const [activeSection, setActiveSection] = useState<SeoEditorSectionKey>("basic");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [form, setForm] = useState<SeoMetadataForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });
  const savedFormRef = useRef<SeoMetadataForm | null>(null);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

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
      const row = await getOrCreateSeoMetadata(locationId, activePage);
      setRecordId(row.id);
      setForm(row.data);
      savedFormRef.current = row.data;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load SEO metadata.");
    } finally {
      setLoading(false);
    }
  }, [activePage, isAllLocations, locationId]);

  useEffect(() => {
    void loadSeo();
  }, [loadSeo, scope, activePage]);

  const validationIssues = useMemo(() => {
    if (!form) return [];
    const pageValidation = validateSeoMetadataForm(form);
    const jsonIssues = validateJsonLd(resolveEffectiveJsonLd(form, locationId, activePage));
    return [...pageValidation.issues, ...jsonIssues];
  }, [activePage, form, locationId]);

  const handleSave = async () => {
    if (!form || !recordId || saving || isAllLocations) return;

    const jsonLd = resolveEffectiveJsonLd(form, locationId, activePage);
    const jsonIssues = validateJsonLd(jsonLd);
    if (hasBlockingSeoErrors(jsonIssues)) {
      showToast("Schema JSON-LD is invalid. Fix JSON before saving.", "error");
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
          form: row.page_key === activePage ? nextForm : row.data,
        })),
      );

      const updated = await updateSeoMetadata(recordId, locationId, activePage, nextForm);
      setForm(updated.data);
      savedFormRef.current = updated.data;

      if (duplicateIssues.length > 0) {
        showToast(`Saved. Warning: ${duplicateIssues[0]?.message ?? "Duplicate SEO detected."}`);
      } else {
        showToast("SEO metadata saved successfully.");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save SEO metadata.", "error");
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
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "SEO" }]} />
        <PageHeader title="SEO Management" description="Manage search, social, schema, and local SEO per page and location." />
        <HomepagePageSkeleton />
      </div>
    );
  }

  if (isAllLocations) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "SEO" }]} />
        <PageHeader title="SEO Management" description="Manage search, social, schema, and local SEO per page and location." />
        <AdminCard>
          <p className="text-sm text-admin-muted">
            Select a single location in the header to edit SEO metadata for that branch.
          </p>
        </AdminCard>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "SEO" }]} />
        <PageHeader title="SEO Management" description="Manage search, social, schema, and local SEO per page and location." />
        <AdminCard>
          <p className="text-sm text-admin-danger">{loadError ?? "Unable to load SEO metadata."}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadSeo()}>
              Retry
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    );
  }

  const locationLabel = getLocationConfig(locationId).shortName;
  const previewUrl = `${getSiteUrl()}/${locationId}${getSeoPagePath(activePage)}`.replace(/\/+$/, "");

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "SEO" }]} />
      <PageHeader
        title="SEO Management"
        description={`Editing ${SEO_PAGE_TABS.find((tab) => tab.key === activePage)?.label ?? activePage} for ${locationLabel}.`}
      >
        <AdminButton type="button" variant="outline" onClick={handleReset} disabled={saving}>
          Reset
        </AdminButton>
        <AdminButton type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save SEO"}
        </AdminButton>
      </PageHeader>

      <AdminCard padding="sm" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {SEO_PAGE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActivePage(tab.key)}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                activePage === tab.key
                  ? "bg-admin-primary text-white"
                  : dark
                    ? "text-white/70 hover:bg-white/5"
                    : "text-admin-muted hover:bg-admin-ivory",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </AdminCard>

      <SeoValidationAlerts issues={validationIssues} />

      <div className="mb-4 text-xs text-admin-muted">
        Preview URL: <span className="font-mono">{previewUrl}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <AdminCard padding="sm">
          <nav className="space-y-1">
            {SEO_EDITOR_SECTIONS.map((section) => (
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
          pageKey={activePage}
          locationId={locationId}
          activeSection={activeSection}
          saving={saving}
          onChange={setForm}
        />
      </div>

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
