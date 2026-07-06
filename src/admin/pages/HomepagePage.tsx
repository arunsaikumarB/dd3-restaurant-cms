import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminButton from "../components/ui/Button";
import AdminToast from "../components/ui/Toast";
import MediaUploadField from "../components/settings/MediaUploadField";
import HomepagePageSkeleton from "../components/settings/HomepagePageSkeleton";
import PageContentSectionPanel from "../components/pageContent/PageContentSectionPanel";
import PageSeoPanel from "../components/seo/PageSeoPanel";
import {
  buildPageContentTabId,
  HOME_PAGE_CONTENT_SECTION_ORDER,
  HOME_PAGE_CONTENT_TAB_LABELS,
  isPageContentTabId,
  parsePageContentTabId,
} from "../config/pageContentAdmin";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import { HOMEPAGE_SECTIONS } from "../data/mock";
import type { HomepageSection } from "../types";
import {
  buildSectionsFromForm,
  getLocalHomepageSections,
  getOrCreateHomepageContent,
  patchFormFromField,
  rowToForm,
  updateHomepageContent,
  type HomepageContentForm,
} from "../../services/homepageContent";
import { uploadFile } from "../../services/storage/upload";
import {
  hasValidationErrors,
  validateHomepageContent,
  type HomepageContentErrors,
} from "../../utils/validation/homepageContent";

type SidebarTab = {
  id: string;
  label: string;
  kind: "legacy" | "page_content" | "seo";
};

const SEO_TAB_ID = "__seo__";

function fieldError(
  sectionId: string,
  key: string,
  errors: HomepageContentErrors,
): string | undefined {
  if (sectionId === "hero" && key === "title") return errors.hero_title;
  if (sectionId === "hero" && key === "primary_cta_label") return errors.primary_cta_label;
  if (sectionId === "hero" && key === "primary_cta_url") return errors.primary_cta_url;
  if (sectionId === "hero" && key === "secondary_cta_label") return errors.secondary_cta_label;
  if (sectionId === "hero" && key === "secondary_cta_url") return errors.secondary_cta_url;
  if (sectionId === "featured" && key === "heading") return errors.about_title;
  return undefined;
}

function renderHeroCtaFields(
  form: HomepageContentForm,
  disabled: boolean,
  dark: boolean,
  errors: HomepageContentErrors,
  onChange: (patch: Partial<HomepageContentForm>) => void,
) {
  const borderClass = dark ? "border-white/10" : "border-admin-border/60";

  return (
    <>
      <div className={`rounded-xl border ${borderClass} p-4`}>
        <p className={`mb-3 text-sm font-medium ${dark ? "text-white/80" : "text-admin-text"}`}>
          Primary CTA
        </p>
        <div className="space-y-3">
          <AdminInput
            label="Label"
            value={form.primary_cta_label}
            disabled={disabled}
            error={fieldError("hero", "primary_cta_label", errors)}
            onChange={(event) => onChange({ primary_cta_label: event.target.value })}
          />
          <AdminInput
            label="URL"
            value={form.primary_cta_url}
            disabled={disabled}
            error={fieldError("hero", "primary_cta_url", errors)}
            onChange={(event) => onChange({ primary_cta_url: event.target.value })}
          />
        </div>
      </div>
      <div className={`rounded-xl border ${borderClass} p-4`}>
        <p className={`mb-3 text-sm font-medium ${dark ? "text-white/80" : "text-admin-text"}`}>
          Secondary CTA
        </p>
        <div className="space-y-3">
          <AdminInput
            label="Label"
            value={form.secondary_cta_label}
            disabled={disabled}
            error={fieldError("hero", "secondary_cta_label", errors)}
            onChange={(event) => onChange({ secondary_cta_label: event.target.value })}
          />
          <AdminInput
            label="URL"
            value={form.secondary_cta_url}
            disabled={disabled}
            error={fieldError("hero", "secondary_cta_url", errors)}
            onChange={(event) => onChange({ secondary_cta_url: event.target.value })}
          />
        </div>
      </div>
    </>
  );
}

export default function HomepageManagementPage() {
  const { dark } = useAdminTheme();
  const { locationId, isAllLocations, scope } = useLocation();
  const [form, setForm] = useState<HomepageContentForm | null>(null);
  const [localSections, setLocalSections] = useState<HomepageSection[]>(getLocalHomepageSections);
  const [activeId, setActiveId] = useState<string>("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<HomepageContentErrors>({});
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const savedFormRef = useRef<HomepageContentForm | null>(null);
  const savedLocalSectionsRef = useRef<HomepageSection[]>(getLocalHomepageSections());

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

  const sidebarTabs = useMemo<SidebarTab[]>(() => {
    const heroTab: SidebarTab = { id: "hero", label: "Hero Banner", kind: "legacy" };
    const pageContentTabs: SidebarTab[] = HOME_PAGE_CONTENT_SECTION_ORDER.map((section) => ({
      id: buildPageContentTabId(section),
      label: HOME_PAGE_CONTENT_TAB_LABELS[section],
      kind: "page_content",
    }));
    const featuredTab: SidebarTab = { id: "featured", label: "Featured Dishes", kind: "legacy" };
    const localTabs: SidebarTab[] = localSections.map((section) => ({
      id: section.id,
      label: section.label,
      kind: "legacy",
    }));
    const seoTab: SidebarTab = { id: SEO_TAB_ID, label: "SEO", kind: "seo" };
    return [heroTab, ...pageContentTabs, featuredTab, ...localTabs, seoTab];
  }, [localSections]);

  const legacySections = useMemo(() => {
    if (!form) return HOMEPAGE_SECTIONS;
    return [...buildSectionsFromForm(form), ...localSections];
  }, [form, localSections]);

  const activeLegacy = legacySections.find((section) => section.id === activeId);
  const activePageContentSection = isPageContentTabId(activeId)
    ? parsePageContentTabId(activeId)
    : null;

  const loadContent = useCallback(async () => {
    if (isAllLocations) {
      setLoading(false);
      setLoadError(null);
      setForm(null);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const row = await getOrCreateHomepageContent(locationId);
      const nextForm = rowToForm(row);
      setForm(nextForm);
      savedFormRef.current = nextForm;
      setFieldErrors({});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load homepage content.");
    } finally {
      setLoading(false);
    }
  }, [isAllLocations, locationId]);

  useEffect(() => {
    void loadContent();
  }, [loadContent, scope]);

  const updateField = (sectionId: string, key: string, value: string) => {
    if (sectionId === "hero" || sectionId === "featured") {
      setForm((prev) => (prev ? patchFormFromField(prev, sectionId, key, value) : prev));
      return;
    }

    setLocalSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.key === key ? { ...field, value } : field,
              ),
            }
          : section,
      ),
    );
  };

  const uploadMedia = async (file: File, folder: "hero-image" | "hero-video") => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { publicUrl } = await uploadFile({
      bucket: "homepage-images",
      file,
      path,
      upsert: true,
    });
    return publicUrl;
  };

  const handleSave = async () => {
    if (!form || saving || isAllLocations) return;

    const errors = validateHomepageContent(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateHomepageContent(locationId, form);
      const nextForm = rowToForm(updated);
      setForm(nextForm);
      savedFormRef.current = nextForm;
      savedLocalSectionsRef.current = localSections.map((section) => ({
        ...section,
        fields: section.fields.map((field) => ({ ...field })),
      }));
      setFieldErrors({});
      showToast("Homepage content saved successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save homepage content.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (savedFormRef.current) {
      setForm({ ...savedFormRef.current });
    }
    setLocalSections(
      savedLocalSectionsRef.current.map((section) => ({
        ...section,
        fields: section.fields.map((field) => ({ ...field })),
      })),
    );
    setFieldErrors({});
  };

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs
          items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Homepage" }]}
        />
        <PageHeader
          title="Homepage Management"
          description="Edit hero, featured sections, and footer content."
        />
        <HomepagePageSkeleton />
      </div>
    );
  }

  if (isAllLocations) {
    return (
      <div>
        <AdminBreadcrumbs
          items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Homepage" }]}
        />
        <PageHeader
          title="Homepage Management"
          description="Edit hero, featured sections, and footer content."
        />
        <AdminCard>
          <p className="text-sm text-admin-muted">
            Select a single location in the header to edit homepage content for that branch.
          </p>
        </AdminCard>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div>
        <AdminBreadcrumbs
          items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Homepage" }]}
        />
        <PageHeader
          title="Homepage Management"
          description="Edit hero, featured sections, and footer content."
        />
        <AdminCard>
          <p className="text-sm text-admin-danger">{loadError ?? "Unable to load homepage content."}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadContent()}>
              Retry
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", path: "/admin/dashboard" },
          { label: "Homepage" },
        ]}
      />
      <PageHeader
        title="Homepage Management"
        description="Edit hero, featured sections, and footer content."
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <AdminCard padding="sm">
          <nav className="space-y-1">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
                className={[
                  "w-full rounded-xl px-4 py-3 text-left text-sm transition-colors",
                  activeId === tab.id
                    ? "bg-admin-primary text-white"
                    : dark
                      ? "hover:bg-white/5"
                      : "hover:bg-admin-ivory",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </AdminCard>

        {activeId === SEO_TAB_ID ? (
          <PageSeoPanel pageKey="homepage" onToast={showToast} />
        ) : activePageContentSection ? (
          <PageContentSectionPanel
            page="home"
            section={activePageContentSection}
            onToast={showToast}
            onSavingChange={setSaving}
          />
        ) : (
          activeLegacy && (
            <motion.div
              key={activeLegacy.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AdminCard>
                <h2 className="text-lg font-semibold">{activeLegacy.label}</h2>
                <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                  {activeLegacy.description}
                </p>
                <div className="mt-6 space-y-4">
                  {activeLegacy.fields.map((field) =>
                    field.type === "textarea" ? (
                      <AdminTextarea
                        key={field.key}
                        label={field.label}
                        value={field.value}
                        onChange={(e) => updateField(activeLegacy.id, field.key, e.target.value)}
                      />
                    ) : (
                      <AdminInput
                        key={field.key}
                        label={field.label}
                        value={field.value}
                        error={fieldError(activeLegacy.id, field.key, fieldErrors)}
                        onChange={(e) => updateField(activeLegacy.id, field.key, e.target.value)}
                      />
                    ),
                  )}
                  {activeLegacy.id === "hero" && form
                    ? renderHeroCtaFields(form, saving, dark, fieldErrors, (patch) =>
                        setForm((prev) => (prev ? { ...prev, ...patch } : prev)),
                      )
                    : null}
                  {activeLegacy.id === "hero" && (
                    <div className="grid gap-6 sm:grid-cols-2">
                      <MediaUploadField
                        label="Hero Image"
                        kind="image"
                        value={form.hero_image}
                        disabled={saving}
                        onChange={(url) =>
                          setForm((prev) => (prev ? { ...prev, hero_image: url || null } : prev))
                        }
                        onUpload={(file) => uploadMedia(file, "hero-image")}
                      />
                      <MediaUploadField
                        label="Hero Video"
                        kind="video"
                        value={form.hero_video}
                        disabled={saving}
                        helpText="Tip: large videos increase bandwidth costs; keep under 5MB."
                        onChange={(url) =>
                          setForm((prev) => (prev ? { ...prev, hero_video: url || null } : prev))
                        }
                        onUpload={(file) => uploadMedia(file, "hero-video")}
                      />
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <AdminButton
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={handleDiscard}
                  >
                    Discard
                  </AdminButton>
                  <AdminButton type="button" disabled={saving} onClick={() => void handleSave()}>
                    {saving ? "Saving…" : "Save Changes"}
                  </AdminButton>
                </div>
              </AdminCard>
            </motion.div>
          )
        )}
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
