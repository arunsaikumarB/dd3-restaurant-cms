import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import AdminCard from "../ui/Card";
import AdminButton from "../ui/Button";
import PageContentSectionForm from "./PageContentSectionForm";
import { useLocation } from "../../hooks/useLocation";
import {
  getPageContentSectionDefinition,
  type PageContentPageKey,
} from "../../../config/pageContentSchema";
import {
  ALL_LOCATIONS_SCOPE_MESSAGE,
  getSection,
  upsertSection,
} from "../../../services/pageContentAdmin";
import {
  cloneSectionContent,
  denormalizeContentForSave,
  normalizeContentForAdmin,
  validateSectionContent,
} from "../../../utils/pageContentFormUtils";

type PageContentSectionPanelProps = {
  page: PageContentPageKey;
  section: string;
  onToast: (message: string, variant?: "success" | "error") => void;
  onSavingChange?: (saving: boolean) => void;
};

export default function PageContentSectionPanel({
  page,
  section,
  onToast,
  onSavingChange,
}: PageContentSectionPanelProps) {
  const { locationId, isAllLocations, scope } = useLocation();
  const definition = getPageContentSectionDefinition(page, section);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const savedRef = useRef<Record<string, unknown>>({});

  const loadSection = useCallback(async () => {
    if (!definition) {
      setLoading(false);
      setLoadError("Section definition not found.");
      return;
    }

    if (isAllLocations) {
      setLoading(false);
      setLoadError(null);
      setContent({});
      savedRef.current = {};
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const raw = await getSection(locationId, page, section);
      const normalized = normalizeContentForAdmin(raw, definition);
      setContent(normalized);
      savedRef.current = cloneSectionContent(normalized);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load section content.");
    } finally {
      setLoading(false);
    }
  }, [definition, isAllLocations, locationId, page, section]);

  useEffect(() => {
    void loadSection();
  }, [loadSection, scope]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [onSavingChange, saving]);

  const handleSave = async () => {
    if (!definition || saving) return;

    if (isAllLocations) {
      onToast(ALL_LOCATIONS_SCOPE_MESSAGE, "error");
      return;
    }

    const validationError = validateSectionContent(content, definition);
    if (validationError) {
      onToast(validationError, "error");
      return;
    }

    setSaving(true);
    try {
      const payload = denormalizeContentForSave(content, definition);
      await upsertSection(locationId, page, section, payload);
      const normalized = normalizeContentForAdmin(payload, definition);
      setContent(normalized);
      savedRef.current = cloneSectionContent(normalized);
      onToast("Page content saved successfully.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Failed to save page content.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setContent(cloneSectionContent(savedRef.current));
  };

  if (!definition) {
    return (
      <AdminCard>
        <p className="text-sm text-admin-danger">Section definition not found.</p>
      </AdminCard>
    );
  }

  if (loading) {
    return (
      <AdminCard>
        <p className="text-sm text-admin-muted">Loading section content…</p>
      </AdminCard>
    );
  }

  if (loadError) {
    return (
      <AdminCard>
        <p className="text-sm text-admin-danger">{loadError}</p>
        <div className="mt-4">
          <AdminButton type="button" onClick={() => void loadSection()}>
            Retry
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  return (
    <motion.div
      key={`${page}:${section}`}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AdminCard>
        <h2 className="text-lg font-semibold">{definition.label}</h2>
        <p className="mt-1 text-sm text-admin-muted">{definition.description}</p>
        <div className="mt-6">
          <PageContentSectionForm
            definition={definition}
            content={content}
            disabled={saving || isAllLocations}
            onChange={setContent}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AdminButton
            type="button"
            variant="outline"
            disabled={saving || isAllLocations}
            onClick={handleDiscard}
          >
            Discard
          </AdminButton>
          <AdminButton type="button" disabled={saving || isAllLocations} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Save Changes"}
          </AdminButton>
        </div>
      </AdminCard>
    </motion.div>
  );
}
