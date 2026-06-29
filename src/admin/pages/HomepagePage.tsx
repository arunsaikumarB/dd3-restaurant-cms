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
import { useAdminTheme } from "../context/AdminThemeContext";
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

function fieldError(
  sectionId: string,
  key: string,
  errors: HomepageContentErrors,
): string | undefined {
  if (sectionId === "hero" && key === "title") return errors.hero_title;
  if (sectionId === "hero" && key === "cta1") return errors.cta_text;
  if (sectionId === "hero" && key === "cta2") return errors.cta_link;
  if (sectionId === "featured" && key === "heading") return errors.about_title;
  return undefined;
}

export default function HomepageManagementPage() {
  const { dark } = useAdminTheme();
  const [contentId, setContentId] = useState<string | null>(null);
  const [form, setForm] = useState<HomepageContentForm | null>(null);
  const [localSections, setLocalSections] = useState<HomepageSection[]>(getLocalHomepageSections);
  const [activeId, setActiveId] = useState(HOMEPAGE_SECTIONS[0]?.id ?? "");
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

  const sections = useMemo(() => {
    if (!form) return HOMEPAGE_SECTIONS;
    return [...buildSectionsFromForm(form), ...localSections];
  }, [form, localSections]);

  const active = sections.find((section) => section.id === activeId);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const row = await getOrCreateHomepageContent();
      const nextForm = rowToForm(row);
      setContentId(row.id);
      setForm(nextForm);
      savedFormRef.current = nextForm;
      setFieldErrors({});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load homepage content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

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
    if (!form || !contentId || saving) return;

    const errors = validateHomepageContent(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateHomepageContent(contentId, form);
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
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveId(section.id)}
                className={[
                  "w-full rounded-xl px-4 py-3 text-left text-sm transition-colors",
                  activeId === section.id
                    ? "bg-admin-primary text-white"
                    : dark ? "hover:bg-white/5" : "hover:bg-admin-ivory",
                ].join(" ")}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </AdminCard>

        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdminCard>
              <h2 className="text-lg font-semibold">{active.label}</h2>
              <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                {active.description}
              </p>
              <div className="mt-6 space-y-4">
                {active.fields.map((field) =>
                  field.type === "textarea" ? (
                    <AdminTextarea
                      key={field.key}
                      label={field.label}
                      value={field.value}
                      onChange={(e) => updateField(active.id, field.key, e.target.value)}
                    />
                  ) : (
                    <AdminInput
                      key={field.key}
                      label={field.label}
                      value={field.value}
                      error={fieldError(active.id, field.key, fieldErrors)}
                      onChange={(e) => updateField(active.id, field.key, e.target.value)}
                    />
                  ),
                )}
                {active.id === "hero" && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <MediaUploadField
                      label="Hero Image"
                      kind="image"
                      value={form.hero_image}
                      disabled={saving}
                      onChange={(url) => setForm((prev) => (prev ? { ...prev, hero_image: url || null } : prev))}
                      onUpload={(file) => uploadMedia(file, "hero-image")}
                    />
                    <MediaUploadField
                      label="Hero Video"
                      kind="video"
                      value={form.hero_video}
                      disabled={saving}
                      onChange={(url) => setForm((prev) => (prev ? { ...prev, hero_video: url || null } : prev))}
                      onUpload={(file) => uploadMedia(file, "hero-video")}
                    />
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <AdminButton type="button" variant="outline" disabled={saving} onClick={handleDiscard}>
                  Discard
                </AdminButton>
                <AdminButton type="button" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "Saving…" : "Save Changes"}
                </AdminButton>
              </div>
            </AdminCard>
          </motion.div>
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
