import { opsTable } from "./client";
import { listWorkflows } from "./workflowAnalytics";
import { getPlannerAnalytics } from "./plannerAnalytics";
import { getToolAnalytics } from "./toolAnalytics";
import { getReflectionOpsAnalytics, getEscalationAnalytics } from "./reflectionAnalytics";
import { getPerformanceAnalytics } from "./performanceAnalytics";

export type ExportFormat = "json" | "csv";
export type ExportKind =
  | "conversation"
  | "workflow"
  | "analytics"
  | "performance"
  | "planner"
  | "reflection"
  | "escalation";

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

export async function exportOpsReport(
  kind: ExportKind,
  format: ExportFormat = "json",
): Promise<void> {
  let payload: unknown;
  let filename = `cheffy-${kind}-${Date.now()}`;

  switch (kind) {
    case "workflow":
    case "conversation":
      payload = await listWorkflows(200);
      break;
    case "planner":
      payload = await getPlannerAnalytics();
      break;
    case "performance":
      payload = await getPerformanceAnalytics();
      break;
    case "reflection":
      payload = await getReflectionOpsAnalytics();
      break;
    case "escalation":
      payload = await getEscalationAnalytics();
      break;
    case "analytics":
    default:
      payload = {
        planner: await getPlannerAnalytics(),
        tools: await getToolAnalytics(),
        reflection: await getReflectionOpsAnalytics(),
        performance: await getPerformanceAnalytics(),
        escalation: await getEscalationAnalytics(),
      };
      break;
  }

  const text =
    format === "csv" && Array.isArray(payload)
      ? toCsv(payload as Array<Record<string, unknown>>)
      : format === "csv"
        ? toCsv([payload as Record<string, unknown>])
        : JSON.stringify(payload, null, 2);

  downloadBlob(
    `${filename}.${format}`,
    text,
    format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
  );

  try {
    const t = opsTable("agent_exports");
    if (t) {
      await t.insert({
        export_type: kind,
        format,
        row_count: Array.isArray(payload) ? payload.length : 1,
        payload_preview: text.slice(0, 500),
      });
    }
  } catch {
    /* optional */
  }
}

/** PDF: printable HTML snapshot (browser print → Save as PDF). */
export async function exportOpsPdf(kind: ExportKind = "analytics"): Promise<void> {
  const data = await (async () => {
    switch (kind) {
      case "planner":
        return getPlannerAnalytics();
      case "performance":
        return getPerformanceAnalytics();
      case "reflection":
        return getReflectionOpsAnalytics();
      default:
        return {
          planner: await getPlannerAnalytics(),
          tools: await getToolAnalytics(),
          reflection: await getReflectionOpsAnalytics(),
          performance: await getPerformanceAnalytics(),
        };
    }
  })();

  const html = `<!DOCTYPE html><html><head><title>Cheffy AI Ops — ${kind}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px}pre{white-space:pre-wrap;font-size:12px}</style>
    </head><body><h1>Cheffy AI Operations</h1><h2>${kind}</h2>
    <pre>${JSON.stringify(data, null, 2)}</pre>
    <script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
