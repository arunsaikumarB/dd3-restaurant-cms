import { jsPDF } from "jspdf";
import type { AnalyticsOfferRow, AnalyticsSummary } from "../../services/analyticsAdmin";
import type { Ga4AnalyticsResponse } from "../../services/gaAnalytics";

export type InsightsPdfSummaryCard = {
  label: string;
  value: number;
  suffix?: string;
};

export type InsightsPdfComparisonRow = {
  name: string;
  summary: AnalyticsSummary;
};

export type InsightsPdfInput = {
  restaurantName: string;
  logoUrl?: string | null;
  locationLabel: string;
  dateRangeLabel: string;
  generatedAt: Date;
  ga: Ga4AnalyticsResponse | null;
  gaError: string | null;
  summaryCards: InsightsPdfSummaryCard[];
  timeseries: { day: string; views: number; sessions: number }[];
  comparisonRows: InsightsPdfComparisonRow[];
  offerRows: AnalyticsOfferRow[];
  firstPartySummary: AnalyticsSummary | null;
  isAllLocations: boolean;
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BRAND = "#ED3C18";
const INK = "#2B1D18";
const MUTED = "#6B5B54";

function formatNum(n: number): string {
  return n.toLocaleString();
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawBarChart(
  items: { label: string; value: number }[],
  width: number,
  height: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || items.length === 0) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const max = Math.max(...items.map((i) => i.value), 1);
  const pad = 24;
  const chartH = height - pad * 2 - 20;
  const chartW = width - pad * 2;
  const barGap = 12;
  const barW = Math.min(48, (chartW - barGap * (items.length - 1)) / items.length);
  const startX = pad + (chartW - (barW * items.length + barGap * (items.length - 1))) / 2;

  items.forEach((item, i) => {
    const barH = (item.value / max) * chartH;
    const x = startX + i * (barW + barGap);
    const y = pad + chartH - barH;
    ctx.fillStyle = i % 2 === 0 ? BRAND : "#C97A2B";
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = INK;
    ctx.font = "11px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(formatNum(item.value), x + barW / 2, y - 4);
    const label = item.label.length > 10 ? `${item.label.slice(0, 9)}…` : item.label;
    ctx.fillStyle = MUTED;
    ctx.font = "10px Helvetica, Arial, sans-serif";
    ctx.fillText(label, x + barW / 2, height - 8);
  });

  return canvas.toDataURL("image/png");
}

function drawPieChart(
  items: { label: string; value: number }[],
  width: number,
  height: number,
  colors: string[],
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || items.length === 0) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const cx = width * 0.38;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.28;
  let start = -Math.PI / 2;

  items.forEach((item, i) => {
    const slice = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    start += slice;
  });

  ctx.font = "11px Helvetica, Arial, sans-serif";
  let legendY = 28;
  const legendX = width * 0.62;
  items.forEach((item, i) => {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(legendX, legendY - 8, 10, 10);
    ctx.fillStyle = INK;
    ctx.fillText(`${item.label}: ${formatNum(item.value)}`, legendX + 16, legendY);
    legendY += 18;
  });

  return canvas.toDataURL("image/png");
}

function drawLineChart(
  points: { day: string; views: number; sessions: number }[],
  width: number,
  height: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || points.length === 0) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const pad = 28;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;
  const max = Math.max(...points.flatMap((p) => [p.views, p.sessions]), 1);

  const plot = (key: "views" | "sessions", color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad + (i / Math.max(points.length - 1, 1)) * chartW;
      const y = pad + chartH - (p[key] / max) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  plot("views", BRAND);
  plot("sessions", "#C97A2B");

  ctx.fillStyle = MUTED;
  ctx.font = "10px Helvetica, Arial, sans-serif";
  ctx.fillText("Views", pad, 14);
  ctx.fillStyle = BRAND;
  ctx.fillRect(pad + 36, 6, 16, 3);
  ctx.fillStyle = MUTED;
  ctx.fillText("Sessions", pad + 90, 14);
  ctx.fillStyle = "#C97A2B";
  ctx.fillRect(pad + 140, 6, 16, 3);

  return canvas.toDataURL("image/png");
}

class PdfBuilder {
  private doc: jsPDF;
  private y = MARGIN;
  private page = 1;

  constructor() {
    this.doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  }

  private footer() {
    const d = this.doc;
    d.setFontSize(8);
    d.setTextColor(MUTED);
    d.text("Generated from Desi Dhamaka CMS", MARGIN, PAGE_H - 10);
    d.text("Powered by Logisoft Technologies", MARGIN, PAGE_H - 6);
    d.text("Generated automatically", PAGE_W / 2, PAGE_H - 10, { align: "center" });
    d.text(`Page ${this.page}`, PAGE_W - MARGIN, PAGE_H - 6, { align: "right" });
  }

  private newPage() {
    this.footer();
    this.doc.addPage();
    this.page += 1;
    this.y = MARGIN;
  }

  ensureSpace(needed: number) {
    if (this.y + needed > PAGE_H - 22) this.newPage();
  }

  heading(text: string, size = 13) {
    this.ensureSpace(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(size);
    this.doc.setTextColor(INK);
    this.doc.text(text, MARGIN, this.y);
    this.y += 8;
  }

  subheading(text: string) {
    this.ensureSpace(8);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(INK);
    this.doc.text(text, MARGIN, this.y);
    this.y += 6;
  }

  paragraph(text: string, size = 9) {
    this.ensureSpace(6);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(MUTED);
    const lines = this.doc.splitTextToSize(text, CONTENT_W);
    this.ensureSpace(lines.length * 4.5);
    this.doc.text(lines, MARGIN, this.y);
    this.y += lines.length * 4.5 + 2;
  }

  bulletList(items: string[]) {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(INK);
    for (const item of items) {
      this.ensureSpace(6);
      const lines = this.doc.splitTextToSize(`• ${item}`, CONTENT_W - 4);
      this.doc.text(lines, MARGIN + 2, this.y);
      this.y += lines.length * 5;
    }
    this.y += 2;
  }

  table(headers: string[], rows: string[][], colWidths: number[]) {
    const rowH = 7;
    this.ensureSpace(rowH * 2);
    let x = MARGIN;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9);
    this.doc.setTextColor(INK);
    headers.forEach((h, i) => {
      this.doc.text(h, x + 1, this.y);
      x += colWidths[i];
    });
    this.y += rowH;
    this.doc.setDrawColor(220, 220, 220);
    this.doc.line(MARGIN, this.y - 4, PAGE_W - MARGIN, this.y - 4);

    this.doc.setFont("helvetica", "normal");
    for (const row of rows) {
      this.ensureSpace(rowH);
      x = MARGIN;
      row.forEach((cell, i) => {
        const lines = this.doc.splitTextToSize(cell, colWidths[i] - 2);
        this.doc.text(lines, x + 1, this.y);
        x += colWidths[i];
      });
      this.y += rowH;
    }
    this.y += 4;
  }

  image(dataUrl: string, w: number, h: number) {
    if (!dataUrl) return;
    this.ensureSpace(h + 4);
    this.doc.addImage(dataUrl, "PNG", MARGIN, this.y, w, h);
    this.y += h + 6;
  }

  cover(input: {
    restaurantName: string;
    locationLabel: string;
    dateRangeLabel: string;
    generatedAt: Date;
    logoDataUrl: string | null;
  }) {
    this.y = MARGIN;
    if (input.logoDataUrl) {
      this.doc.addImage(input.logoDataUrl, "PNG", MARGIN, MARGIN, 36, 14);
      this.y = MARGIN + 18;
    }
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(18);
    this.doc.setTextColor(INK);
    this.doc.text(input.restaurantName, MARGIN, this.y);
    this.y += 8;
    this.doc.setFontSize(14);
    this.doc.text("Insights Report", MARGIN, this.y);
    this.y += 10;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(MUTED);
    this.doc.text(`Location: ${input.locationLabel}`, MARGIN, this.y);
    this.y += 5;
    this.doc.text(`Date range: ${input.dateRangeLabel}`, MARGIN, this.y);
    this.y += 5;
    this.doc.text(
      `Generated: ${input.generatedAt.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })}`,
      MARGIN,
      this.y,
    );
    this.y += 12;
  }

  finish(): jsPDF {
    this.footer();
    return this.doc;
  }
}

export async function exportInsightsPdf(input: InsightsPdfInput): Promise<void> {
  const pdf = new PdfBuilder();
  const logoData =
    (input.logoUrl ? await loadImageDataUrl(input.logoUrl) : null) ??
    (await loadImageDataUrl("/logo/desi-dhamaka-logo.webp"));

  pdf.cover({
    restaurantName: input.restaurantName,
    locationLabel: input.locationLabel,
    dateRangeLabel: input.dateRangeLabel,
    generatedAt: input.generatedAt,
    logoDataUrl: logoData,
  });

  // Section 1 — Overview
  pdf.heading("Section 1 — Overview");
  if (input.gaError) {
    pdf.paragraph(`Google Analytics unavailable: ${input.gaError}`);
  } else if (input.summaryCards.length === 0) {
    pdf.paragraph("No overview data for this period.");
  } else {
    pdf.bulletList(
      input.summaryCards.map((c) => {
        const suffix = c.suffix ? ` ${c.suffix}` : "";
        return `${c.label}: ${formatNum(c.value)}${suffix}`;
      }),
    );
    if (input.timeseries.length > 0) {
      pdf.subheading("Views over time");
      const chart = drawLineChart(input.timeseries, 900, 280);
      pdf.image(chart, CONTENT_W, 42);
    }
  }

  if (!input.ga) {
    pdf.finish().save(buildFilename(input));
    return;
  }

  // Section 2 — Traffic Sources
  pdf.heading("Section 2 — Traffic Sources");
  if (input.ga.trafficSources.length === 0) {
    pdf.paragraph("No traffic source data.");
  } else {
    const chart = drawBarChart(input.ga.trafficSources, 900, 260);
    pdf.image(chart, CONTENT_W, 38);
    pdf.table(
      ["Source", "Sessions"],
      input.ga.trafficSources.map((r) => [r.label, formatNum(r.value)]),
      [CONTENT_W * 0.65, CONTENT_W * 0.35],
    );
  }

  // Section 3 — Top Pages
  pdf.heading("Section 3 — Top Pages");
  if (input.ga.topPages.length === 0) {
    pdf.paragraph("No page view data.");
  } else {
    const chart = drawBarChart(input.ga.topPages.slice(0, 8), 900, 280);
    pdf.image(chart, CONTENT_W, 42);
    pdf.table(
      ["Page", "Views"],
      input.ga.topPages.map((r) => [r.label, formatNum(r.value)]),
      [CONTENT_W * 0.7, CONTENT_W * 0.3],
    );
  }

  // Section 4 — Devices
  pdf.heading("Section 4 — Devices");
  if (input.ga.devices.length === 0) {
    pdf.paragraph("No device data.");
  } else {
    const chart = drawPieChart(
      input.ga.devices,
      900,
      280,
      [BRAND, "#C97A2B", "#2B1D18", "#8B7355"],
    );
    pdf.image(chart, CONTENT_W, 42);
    pdf.bulletList(input.ga.devices.map((d) => `${d.label}: ${formatNum(d.value)}`));
  }

  // Section 5 — Countries
  pdf.heading("Section 5 — Countries");
  if (input.ga.countries.length === 0) {
    pdf.paragraph("No country data.");
  } else {
    const chart = drawBarChart(input.ga.countries.slice(0, 8), 900, 260);
    pdf.image(chart, CONTENT_W, 38);
    pdf.table(
      ["Country", "Active Users"],
      input.ga.countries.map((r) => [r.label, formatNum(r.value)]),
      [CONTENT_W * 0.65, CONTENT_W * 0.35],
    );
  }

  // Section 6 — Realtime
  pdf.heading("Section 6 — Realtime Users");
  pdf.paragraph(
    `Active users in the last 30 minutes: ${formatNum(input.ga.realtimeActiveUsers)}`,
  );

  // Section 7 — Restaurant Insights
  pdf.heading("Section 7 — Restaurant Insights");
  if (input.isAllLocations) {
    pdf.subheading("Location comparison");
    if (input.comparisonRows.length === 0) {
      pdf.paragraph("No location comparison data.");
    } else {
      pdf.table(
        ["Location", "Page Views", "Visitors", "Offers Views", "Offer Clicks", "Orders", "Reservations"],
        input.comparisonRows.map((r) => [
          r.name,
          formatNum(r.summary.total_page_views),
          formatNum(r.summary.unique_sessions),
          formatNum(r.summary.offers_page_views),
          formatNum(r.summary.offer_clicks),
          formatNum(r.summary.order_clicks),
          formatNum(r.summary.reservation_clicks),
        ]),
        [32, 22, 22, 24, 24, 20, 26],
      );
    }
  } else if (input.firstPartySummary) {
    const s = input.firstPartySummary;
    pdf.bulletList([
      `Order Online Clicks: ${formatNum(s.order_clicks)}`,
      `Reservation Clicks: ${formatNum(s.reservation_clicks)}`,
      `Offer Page Views: ${formatNum(s.offers_page_views)}`,
      `Offer Clicks: ${formatNum(s.offer_clicks)}`,
    ]);
    if (input.offerRows.length > 0) {
      pdf.subheading("Offers performance");
      pdf.table(
        ["Offer", "Views", "Clicks"],
        input.offerRows.map((r) => [r.offer_title, formatNum(r.views), formatNum(r.clicks)]),
        [CONTENT_W * 0.55, CONTENT_W * 0.225, CONTENT_W * 0.225],
      );
    }
  } else {
    pdf.paragraph("No first-party restaurant insights for this period.");
  }

  pdf.finish().save(buildFilename(input));
}

function buildFilename(input: InsightsPdfInput): string {
  const slug = input.locationLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const date = input.generatedAt.toISOString().slice(0, 10);
  return `desi-dhamaka-insights-${slug}-${date}.pdf`;
}
