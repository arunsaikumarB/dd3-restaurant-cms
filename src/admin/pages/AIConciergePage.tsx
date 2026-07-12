import { useCallback, useMemo, useState } from "react";
import { Bot, Save } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminButton from "../components/ui/Button";
import AdminToast from "../components/ui/Toast";
import AdminBadge from "../components/ui/Badge";
import SettingsPageSkeleton from "../components/settings/SettingsPageSkeleton";
import AISectionNav from "../components/aiConcierge/AISectionNav";
import {
  AdvancedSection,
  AnalyticsSection,
  ConversationSection,
  ErrorLogsSection,
  GeneralSection,
  KnowledgeSection,
  LocationOverridesSection,
  LogsSection,
  PersonalitySection,
  PromptSection,
  ProviderSection,
  SuggestionsSection,
  TestingSection,
} from "../components/aiConcierge/AIConciergeSections";
import {
  CostAnalyticsSection,
  FeedbackIntelligenceSection,
  ImprovementsSection,
  KnowledgeAuditSection,
  KnowledgeDebuggerSection,
  QualityAnalyticsSection,
  ReflectionDashboardSection,
  RelationshipsSection,
  SearchLabSection,
  ValidatorSection,
} from "../components/aiConcierge/KnowledgeIntelligenceSections";
import { AgentAnalyticsSection } from "../components/aiConcierge/AgentAnalyticsSections";
import { useLocation } from "../hooks/useLocation";
import { useAIConciergeAdmin } from "../hooks/useAIConciergeAdmin";
import { useAuth } from "../../hooks/useAuth";
import { getAIConciergePermissions } from "../../services/aiAdmin/permissions";
import { DEFAULT_PUBLIC_LOCATION_ID, type LocationId } from "../../config/locations";
import "../admin.css";

export default function AIConciergePage() {
  const { locationId, isAllLocations } = useLocation();
  const { role, profile } = useAuth();
  const permissions = useMemo(
    () => getAIConciergePermissions(role ?? "staff", profile?.ai_access_level),
    [role, profile?.ai_access_level],
  );

  const {
    loading,
    saving,
    error,
    settings,
    setSettings,
    personality,
    setPersonality,
    provider,
    setProvider,
    activePrompt,
    defaultPrompt,
    suggestions,
    followups,
    analytics,
    reload,
    saveAll,
    savePrompt,
  } = useAIConciergeAdmin(locationId, isAllLocations);

  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const testLocationId = (isAllLocations ? DEFAULT_PUBLIC_LOCATION_ID : locationId) as LocationId;
  const readOnly = permissions.readOnly || isAllLocations;

  const handleSave = useCallback(async () => {
    try {
      await saveAll();
      setToast({ open: true, message: "AI Concierge settings saved.", variant: "success" });
    } catch {
      setToast({ open: true, message: "Failed to save settings.", variant: "error" });
    }
  }, [saveAll]);

  const handleSavePrompt = useCallback(
    async (content: string, version: string, notes: string) => {
      try {
        await savePrompt(content, version, notes);
        setToast({ open: true, message: `Prompt ${version} activated.`, variant: "success" });
      } catch {
        setToast({ open: true, message: "Failed to save prompt.", variant: "error" });
      }
    },
    [savePrompt],
  );

  if (loading || !settings || !personality || !provider) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "AI Concierge" }]} />
        <PageHeader title="AI Concierge" description="Configure Cheffy without changing code." />
        <SettingsPageSkeleton />
      </div>
    );
  }

  return (
    <div className="ai-concierge-page">
      <AdminBreadcrumbs items={[{ label: "Integrations", path: "/admin/integrations/chefgaa" }, { label: "AI Concierge" }]} />
      <PageHeader
        title="AI Concierge"
        description="Enterprise control center for Cheffy — personality, knowledge, prompts, analytics, and testing."
      >
        <div className="flex flex-wrap items-center gap-2">
          <AdminBadge variant="outline">
            <Bot size={14} className="inline mr-1" />
            {permissions.level.replace("_", " ")}
          </AdminBadge>
          {isAllLocations && <AdminBadge variant="warning">Select a location for overrides</AdminBadge>}
          {!readOnly && (
            <AdminButton onClick={() => void handleSave()} disabled={saving}>
              <Save size={16} />
              {saving ? "Saving…" : "Save Changes"}
            </AdminButton>
          )}
        </div>
      </PageHeader>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="ai-concierge-layout">
        <aside className="ai-concierge-layout__nav">
          <AISectionNav />
        </aside>
        <div className="ai-concierge-layout__content space-y-6">
          <GeneralSection settings={settings} setSettings={setSettings} permissions={permissions} disabled={readOnly} />
          <PersonalitySection personality={personality} setPersonality={setPersonality} permissions={permissions} disabled={readOnly} />
          <LocationOverridesSection personality={personality} setPersonality={setPersonality} permissions={permissions} disabled={readOnly} />
          <KnowledgeSection settings={settings} setSettings={setSettings} permissions={permissions} disabled={readOnly} onRefresh={() => void reload()} />
          <KnowledgeDebuggerSection locationId={testLocationId} permissions={permissions} disabled={readOnly} />
          <ReflectionDashboardSection />
          <AgentAnalyticsSection />
          <SearchLabSection locationId={testLocationId} permissions={permissions} disabled={readOnly} />
          <FeedbackIntelligenceSection />
          <RelationshipsSection locationId={testLocationId} permissions={permissions} disabled={readOnly} />
          <ValidatorSection locationId={testLocationId} permissions={permissions} disabled={readOnly} />
          <CostAnalyticsSection />
          <QualityAnalyticsSection />
          <ImprovementsSection locationId={testLocationId} permissions={permissions} disabled={readOnly} />
          <KnowledgeAuditSection />
          <ProviderSection provider={provider} setProvider={setProvider} permissions={permissions} disabled={readOnly} />
          <PromptSection activePrompt={activePrompt} defaultPrompt={defaultPrompt} onSave={handleSavePrompt} permissions={permissions} disabled={readOnly} />
          <ConversationSection settings={settings} setSettings={setSettings} permissions={permissions} disabled={readOnly} />
          <SuggestionsSection suggestions={suggestions} followups={followups} onReload={() => void reload()} permissions={permissions} disabled={readOnly} />
          <AnalyticsSection analytics={analytics} />
          <TestingSection locationId={testLocationId} permissions={permissions} disabled={readOnly} />
          <LogsSection permissions={permissions} />
          <ErrorLogsSection permissions={permissions} />
          <AdvancedSection settings={settings} setSettings={setSettings} permissions={permissions} disabled={readOnly} />
        </div>
      </div>

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
