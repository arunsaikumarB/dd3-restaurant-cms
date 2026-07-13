import { useEffect, useState } from "react";
import AdminCard from "../ui/Card";
import AdminBadge from "../ui/Badge";
import AdminButton from "../ui/Button";
import AdminInput from "../ui/Input";
import AdminSelect from "../ui/Select";
import AdminTextarea from "../ui/Textarea";
import {
  addOptOut,
  approveCampaign,
  createCampaign,
  createCampaignFromTrigger,
  getCompliance,
  getOutboundAnalytics,
  launchCampaign,
  listCampaignRuns,
  listCampaigns,
  listJobs,
  listOptOuts,
  listOutboundCalls,
  listOutboundOutcomes,
  listRetries,
  listTemplates,
  placeOutboundCall,
  queueManualCallback,
  submitCampaignForApproval,
  upsertCompliance,
  upsertTemplate,
  type CampaignRun,
  type CampaignTemplate,
  type OptOutRecord,
  type OutboundAnalyticsSnapshot,
  type OutboundCall,
  type OutboundCampaign,
  type OutboundCompliance,
} from "../../../services/voice";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="kb-metric">
      <p className="kb-metric__label">{label}</p>
      <p className="kb-metric__value">{value}</p>
    </div>
  );
}

type Props = {
  outlet: string;
  tab: string;
  showToast: (message: string, variant?: "success" | "error") => void;
};

export default function VoiceOutboundPanels({ outlet, tab, showToast }: Props) {
  const [campaigns, setCampaigns] = useState<OutboundCampaign[]>([]);
  const [calls, setCalls] = useState<OutboundCall[]>([]);
  const [runs, setRuns] = useState<CampaignRun[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [analytics, setAnalytics] = useState<OutboundAnalyticsSnapshot | null>(null);
  const [optOuts, setOptOuts] = useState<OptOutRecord[]>([]);
  const [retries, setRetries] = useState<Array<Record<string, unknown>>>([]);
  const [outcomes, setOutcomes] = useState<Array<Record<string, unknown>>>([]);
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [compliance, setCompliance] = useState<OutboundCompliance | null>(null);
  const [campName, setCampName] = useState("Tomorrow reservation reminders");
  const [callType, setCallType] = useState("reservation_reminder");
  const [trigger, setTrigger] = useState("reservation_tomorrow");
  const [manualPhone, setManualPhone] = useState("7325551212");
  const [optPhone, setOptPhone] = useState("");
  const [templateHint, setTemplateHint] = useState("");

  const refresh = async () => {
    const [c, callsList, r, t, a, o, ret, out, j, comp] = await Promise.all([
      listCampaigns(outlet),
      listOutboundCalls(outlet, 50),
      listCampaignRuns(outlet, 30),
      listTemplates(outlet),
      getOutboundAnalytics(outlet),
      listOptOuts(outlet),
      listRetries(outlet),
      listOutboundOutcomes(outlet),
      listJobs(outlet),
      getCompliance(outlet),
    ]);
    setCampaigns(c);
    setCalls(callsList);
    setRuns(r);
    setTemplates(t);
    setAnalytics(a);
    setOptOuts(o);
    setRetries(ret as Array<Record<string, unknown>>);
    setOutcomes(out as Array<Record<string, unknown>>);
    setJobs(j as Array<Record<string, unknown>>);
    setCompliance(comp);
  };

  useEffect(() => {
    void refresh();
  }, [outlet, tab]);

  if (tab === "outbound_campaigns") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Outbound Campaigns</h3>
          <p className="mb-3 text-sm opacity-70">
            Proactive calls reuse Voice Gateway, Planner, Reservation Engine, CRM, and Human Handoff.
          </p>
          <ul className="max-h-96 space-y-2 overflow-auto text-sm">
            {campaigns.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 border-b border-admin-border/30 pb-2">
                <AdminBadge variant={c.status === "approved" || c.status === "running" ? "success" : "outline"}>
                  {c.status}
                </AdminBadge>
                <span>{c.name}</span>
                <span className="opacity-60">{c.callType}</span>
                {c.status === "draft" && (
                  <AdminButton
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await submitCampaignForApproval(c.id);
                      showToast("Submitted for approval");
                      void refresh();
                    }}
                  >
                    Submit
                  </AdminButton>
                )}
                {(c.status === "pending_approval" || c.status === "draft") && (
                  <AdminButton
                    size="sm"
                    onClick={async () => {
                      await approveCampaign(c.id);
                      showToast("Campaign approved");
                      void refresh();
                    }}
                  >
                    Approve
                  </AdminButton>
                )}
                {(c.status === "approved" || c.status === "draft") && (
                  <AdminButton
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (c.status === "draft") await approveCampaign(c.id);
                      const res = await launchCampaign({
                        campaignId: c.id,
                        dialNow: true,
                        simulateAnswered: true,
                        limit: 10,
                      });
                      showToast(
                        `Queued ${res.queued}, dialed ${res.dialed}, blocked ${res.blocked}`,
                        res.queued ? "success" : "error",
                      );
                      void refresh();
                    }}
                  >
                    Launch + dial
                  </AdminButton>
                )}
              </li>
            ))}
            {!campaigns.length && (
              <li className="opacity-60">No campaigns yet — use Campaign Builder or apply migration 054.</li>
            )}
          </ul>
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Active / recent outbound calls</h3>
          <ul className="max-h-96 space-y-2 overflow-auto text-sm">
            {calls.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <AdminBadge variant="info">{c.status}</AdminBadge>
                {c.customerName ?? "Guest"} · {c.customerPhone} · {c.callType}
                {c.status === "queued" && (
                  <AdminButton
                    size="sm"
                    onClick={async () => {
                      const r = await placeOutboundCall({ callId: c.id, simulate: "answered" });
                      showToast(r.message, r.ok ? "success" : "error");
                      void refresh();
                    }}
                  >
                    Dial
                  </AdminButton>
                )}
              </li>
            ))}
            {!calls.length && <li className="opacity-60">No outbound calls yet.</li>}
          </ul>
        </AdminCard>
      </div>
    );
  }

  if (tab === "campaign_builder") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Campaign Builder</h3>
        <AdminInput label="Campaign name" value={campName} onChange={(e) => setCampName(e.target.value)} />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <AdminSelect
            label="Call type"
            value={callType}
            onChange={setCallType}
            options={[
              { value: "reservation_reminder", label: "Reservation Reminder" },
              { value: "reservation_confirmation", label: "Reservation Confirmation" },
              { value: "birthday_greeting", label: "Birthday Greeting" },
              { value: "special_promotions", label: "Special Promotions" },
              { value: "waitlist_availability", label: "Waitlist Availability" },
              { value: "customer_feedback", label: "Customer Feedback" },
              { value: "missed_call_callback", label: "Missed Call Callback" },
              { value: "manual_staff_call", label: "Manual Staff Call" },
            ]}
          />
          <AdminSelect
            label="Trigger shortcut"
            value={trigger}
            onChange={setTrigger}
            options={[
              { value: "reservation_tomorrow", label: "Reservation Tomorrow" },
              { value: "reservation_today", label: "Reservation Today" },
              { value: "birthday", label: "Birthday" },
              { value: "anniversary", label: "Anniversary" },
              { value: "no_visit_90_days", label: "No Visit 90 Days" },
              { value: "new_offer_published", label: "New Offer" },
              { value: "missed_call", label: "Missed Call" },
              { value: "crm_segment", label: "CRM Segment" },
            ]}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton
            onClick={async () => {
              const c = await createCampaign({
                locationId: outlet,
                name: campName,
                callType: callType as OutboundCampaign["callType"],
                campaignType: "one_time",
                audienceFilter: {
                  locationId: outlet,
                  hasUpcomingReservation: callType.includes("reservation"),
                  reservationDate: undefined,
                },
                approvalRequired: true,
                immediate: true,
              });
              showToast(c ? "Campaign drafted" : "Failed", c ? "success" : "error");
              void refresh();
            }}
          >
            Create draft
          </AdminButton>
          <AdminButton
            variant="outline"
            onClick={async () => {
              const c = await createCampaignFromTrigger({
                locationId: outlet,
                trigger: trigger as Parameters<typeof createCampaignFromTrigger>[0]["trigger"],
              });
              showToast(c ? `Trigger campaign: ${c.name}` : "Failed", c ? "success" : "error");
              void refresh();
            }}
          >
            Create from trigger
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  if (tab === "outbound_schedules") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Schedules</h3>
        <ul className="max-h-96 space-y-2 overflow-auto text-sm">
          {jobs.map((j) => (
            <li key={String(j.id)}>
              <AdminBadge variant="outline">{String(j.status)}</AdminBadge> {String(j.job_type)} ·{" "}
              {String(j.run_at ?? "").slice(0, 19)} · ref {String(j.ref_id ?? "—")}
            </li>
          ))}
          {!jobs.length && <li className="opacity-60">No scheduler jobs yet.</li>}
        </ul>
        <h4 className="mb-2 mt-4 text-xs font-semibold uppercase opacity-70">Campaign runs</h4>
        <ul className="space-y-1 text-sm">
          {runs.map((r) => (
            <li key={r.id}>
              {r.status} · audience {r.audienceCount} · placed {r.placedCount} · answered {r.answeredCount}
            </li>
          ))}
        </ul>
      </AdminCard>
    );
  }

  if (tab === "outbound_audience") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Audience Builder</h3>
        <p className="mb-3 text-sm opacity-70">
          Audiences are built from CRM customers and Reservation Engine data at launch time — no separate customer
          database.
        </p>
        <AdminInput
          label="Manual callback phone"
          value={manualPhone}
          onChange={(e) => setManualPhone(e.target.value)}
        />
        <AdminButton
          className="mt-2"
          onClick={async () => {
            const r = await queueManualCallback({
              locationId: outlet,
              phone: manualPhone,
              name: "Manual guest",
            });
            showToast(r.campaignId ? `Callback campaign queued (${r.queued})` : "Failed", r.campaignId ? "success" : "error");
            void refresh();
          }}
        >
          Queue manual callback
        </AdminButton>
      </AdminCard>
    );
  }

  if (tab === "outbound_triggers") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Triggers</h3>
        <p className="text-sm opacity-80">
          Supported: reservation created/today/tomorrow, birthday, anniversary, no visit 90 days, loyalty milestone,
          new offer, waitlist available, manager/customer callback, missed call, failed reservation, CRM segment.
        </p>
        <AdminButton
          className="mt-3"
          onClick={async () => {
            const c = await createCampaignFromTrigger({
              locationId: outlet,
              trigger: "reservation_tomorrow",
            });
            if (c) {
              await approveCampaign(c.id);
              const res = await launchCampaign({ campaignId: c.id, dialNow: true, limit: 5 });
              showToast(`Reminder campaign · queued ${res.queued}`);
            }
            void refresh();
          }}
        >
          Run tomorrow-reminder trigger
        </AdminButton>
      </AdminCard>
    );
  }

  if (tab === "call_templates") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Call Templates</h3>
          <ul className="max-h-80 space-y-2 overflow-auto text-sm">
            {templates.map((t) => (
              <li key={t.id}>
                <AdminBadge variant="info">{t.code}</AdminBadge> {t.name}
                <p className="opacity-70">{t.scriptHint}</p>
              </li>
            ))}
            {!templates.length && <li className="opacity-60">Apply migration 054 to seed templates.</li>}
          </ul>
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Update template hint</h3>
          <AdminSelect
            label="Template"
            value={callType}
            onChange={setCallType}
            options={templates.map((t) => ({ value: t.code, label: t.name }))}
          />
          <AdminTextarea
            className="mt-2"
            label="Script hint"
            value={templateHint}
            onChange={(e) => setTemplateHint(e.target.value)}
            rows={4}
          />
          <AdminButton
            className="mt-2"
            onClick={async () => {
              const t = templates.find((x) => x.code === callType);
              await upsertTemplate({
                locationId: outlet,
                code: callType,
                name: t?.name ?? callType,
                callType: t?.callType ?? callType,
                scriptHint: templateHint,
                voicemailHint: t?.voicemailHint ?? undefined,
                variables: t?.variables,
              });
              showToast("Template saved");
              void refresh();
            }}
          >
            Save hint
          </AdminButton>
        </AdminCard>
      </div>
    );
  }

  if (tab === "outbound_compliance") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Compliance</h3>
        {compliance && (
          <div className="grid gap-2 sm:grid-cols-2">
            <AdminInput
              label="Calling hours start"
              value={compliance.callingHoursStart}
              onChange={(e) => setCompliance({ ...compliance, callingHoursStart: e.target.value })}
            />
            <AdminInput
              label="Calling hours end"
              value={compliance.callingHoursEnd}
              onChange={(e) => setCompliance({ ...compliance, callingHoursEnd: e.target.value })}
            />
            <AdminInput
              label="Quiet hours start"
              value={compliance.quietHoursStart}
              onChange={(e) => setCompliance({ ...compliance, quietHoursStart: e.target.value })}
            />
            <AdminInput
              label="Quiet hours end"
              value={compliance.quietHoursEnd}
              onChange={(e) => setCompliance({ ...compliance, quietHoursEnd: e.target.value })}
            />
            <AdminInput
              label="Timezone"
              value={compliance.timezone}
              onChange={(e) => setCompliance({ ...compliance, timezone: e.target.value })}
            />
            <AdminInput
              label="Country"
              value={compliance.countryCode}
              onChange={(e) => setCompliance({ ...compliance, countryCode: e.target.value })}
            />
          </div>
        )}
        <AdminButton
          className="mt-3"
          onClick={async () => {
            if (!compliance) return;
            await upsertCompliance(outlet, compliance);
            showToast("Compliance saved");
            void refresh();
          }}
        >
          Save compliance
        </AdminButton>
      </AdminCard>
    );
  }

  if (tab === "outbound_voicemail") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Voicemail</h3>
        <p className="mb-3 text-sm opacity-70">Templates drive natural voicemail when a call is not answered.</p>
        <ul className="space-y-2 text-sm">
          {templates.map((t) => (
            <li key={t.id}>
              <strong>{t.name}</strong>
              <p className="opacity-70">{t.voicemailHint}</p>
            </li>
          ))}
        </ul>
      </AdminCard>
    );
  }

  if (tab === "retry_policies") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Retry Policies / Queue</h3>
        <ul className="max-h-96 space-y-2 overflow-auto text-sm">
          {retries.map((r) => (
            <li key={String(r.id)}>
              attempt {String(r.attempt)} · {String(r.status)} · {String(r.scheduled_for ?? "").slice(0, 19)} ·{" "}
              {String(r.reason ?? "")}
            </li>
          ))}
          {!retries.length && <li className="opacity-60">No retries queued.</li>}
        </ul>
      </AdminCard>
    );
  }

  if (tab === "outbound_analytics") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Campaign Analytics</h3>
          {analytics && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Calls placed" value={analytics.callsPlaced} />
              <Metric label="Answered" value={analytics.callsAnswered} />
              <Metric label="Answer rate" value={`${Math.round(analytics.answerRate * 100)}%`} />
              <Metric label="Confirmations" value={analytics.confirmations} />
              <Metric label="Modifications" value={analytics.modifications} />
              <Metric label="Cancellations" value={analytics.cancellations} />
              <Metric label="Conversions" value={analytics.conversions} />
              <Metric label="Voicemails" value={analytics.voicemails} />
              <Metric label="Retries" value={analytics.retries} />
              <Metric label="Opt-outs" value={analytics.optOuts} />
              <Metric label="Avg duration ms" value={analytics.averageDurationMs} />
            </div>
          )}
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Outcomes</h3>
          <ul className="max-h-80 space-y-2 overflow-auto text-sm">
            {outcomes.map((o) => (
              <li key={String(o.id)}>
                {String(o.outcome_type)} · {String(o.summary ?? "").slice(0, 80)}
              </li>
            ))}
            {!outcomes.length && <li className="opacity-60">No outcomes yet.</li>}
          </ul>
        </AdminCard>
      </div>
    );
  }

  if (tab === "outbound_optouts") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Opt-outs / Do Not Call</h3>
        <AdminInput label="Phone to opt out" value={optPhone} onChange={(e) => setOptPhone(e.target.value)} />
        <AdminButton
          className="mt-2"
          onClick={async () => {
            await addOptOut({ phone: optPhone, locationId: outlet, reason: "admin" });
            showToast("Opt-out saved");
            setOptPhone("");
            void refresh();
          }}
        >
          Add opt-out
        </AdminButton>
        <ul className="mt-4 max-h-80 space-y-2 overflow-auto text-sm">
          {optOuts.map((o) => (
            <li key={o.id}>
              {o.phone} · {o.reason ?? "—"} · {o.createdAt.slice(0, 10)}
            </li>
          ))}
          {!optOuts.length && <li className="opacity-60">No opt-outs.</li>}
        </ul>
      </AdminCard>
    );
  }

  return null;
}
