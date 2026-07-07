import type { ToolLogEntry } from "./types";

const MAX_LOG_ENTRIES = 200;
const logBuffer: ToolLogEntry[] = [];

/** Structured tool execution logging — no API keys or PII. */
export function logToolExecution(entry: ToolLogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.splice(0, logBuffer.length - MAX_LOG_ENTRIES);
  }

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    const status = entry.success ? "ok" : "fail";
    const cache = entry.cached ? " cached" : "";
    console.info(
      `[cheffy:tool] ${entry.tool} ${status}${cache} ${entry.durationMs}ms loc=${entry.locationId}`,
    );
  }
}

export function getRecentToolLogs(limit = 50): ToolLogEntry[] {
  return logBuffer.slice(-limit);
}
