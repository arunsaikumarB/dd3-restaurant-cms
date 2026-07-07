import { useCallback, useEffect, useState } from "react";
import type { LocationId } from "../../config/locations";
import {
  fetchAIAnalytics,
  fetchAIPersonality,
  fetchAIProviderSettings,
  fetchAISettings,
  fetchActivePrompt,
  getDefaultPromptContent,
  listFollowups,
  listSuggestedQuestions,
  saveAIPersonality,
  saveAIProviderSettings,
  saveAISettings,
  savePromptVersion,
  type AIAnalyticsSummary,
} from "../../services/aiAdmin";
import type {
  AIFollowupRow,
  AIPersonalityRow,
  AIPromptVersionRow,
  AIProviderSettingsRow,
  AISettingsRow,
  AISuggestedQuestionRow,
} from "../../types/aiAdmin";

export function useAIConciergeAdmin(locationId: LocationId | null, isAllLocations: boolean) {
  const scopeLocationId = isAllLocations ? null : locationId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AISettingsRow | null>(null);
  const [personality, setPersonality] = useState<AIPersonalityRow | null>(null);
  const [provider, setProvider] = useState<AIProviderSettingsRow | null>(null);
  const [activePrompt, setActivePrompt] = useState<AIPromptVersionRow | null>(null);
  const [defaultPrompt] = useState(getDefaultPromptContent);
  const [suggestions, setSuggestions] = useState<AISuggestedQuestionRow[]>([]);
  const [followups, setFollowups] = useState<AIFollowupRow[]>([]);
  const [analytics, setAnalytics] = useState<AIAnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRow, personalityRow, providerRow, promptRow, suggestionRows, followupRows, analyticsRow] =
        await Promise.all([
          fetchAISettings(scopeLocationId),
          fetchAIPersonality(scopeLocationId),
          fetchAIProviderSettings(),
          fetchActivePrompt(),
          listSuggestedQuestions(undefined, scopeLocationId),
          listFollowups(),
          fetchAIAnalytics(),
        ]);
      setSettings(settingsRow);
      setPersonality(personalityRow);
      setProvider(providerRow);
      setActivePrompt(promptRow);
      setSuggestions(suggestionRows);
      setFollowups(followupRows);
      setAnalytics(analyticsRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI settings.");
    } finally {
      setLoading(false);
    }
  }, [scopeLocationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveAll = useCallback(async () => {
    if (!settings || !personality || !provider) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        saveAISettings(settings),
        saveAIPersonality(personality),
        saveAIProviderSettings(provider),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [settings, personality, provider]);

  const savePrompt = useCallback(
    async (content: string, version: string, notes: string) => {
      const row = await savePromptVersion({
        version,
        content,
        notes,
        is_active: true,
      });
      setActivePrompt(row);
    },
    [],
  );

  return {
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
    setSuggestions,
    followups,
    setFollowups,
    analytics,
    reload,
    saveAll,
    savePrompt,
    scopeLocationId,
  };
}
