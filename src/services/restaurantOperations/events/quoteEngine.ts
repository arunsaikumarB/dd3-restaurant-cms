/**
 * Quote Builder — line items, taxes, version history, PDF-ready text.
 */

import { roundMoney } from "./client";
import { estimatePackageTotal } from "./packageEngine";
import {
  getLatestQuote,
  getSettings,
  insertDocument,
  insertQuote,
  insertQuoteVersion,
  updateQuote,
} from "./repository";
import type {
  EventPackage,
  EventQuote,
  EventRecord,
  EventRequirements,
  QuoteLineItem,
} from "./types";

export type QuoteBuildInput = {
  event: EventRecord;
  pkg: EventPackage | null;
  req?: EventRequirements;
  discount?: number;
  deliveryFee?: number;
  addonCodes?: string[];
  notes?: string;
};

export async function buildQuoteTotals(input: QuoteBuildInput): Promise<{
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
}> {
  const settings = await getSettings(input.event.locationId);
  const taxRate = settings?.taxRate ?? 0.06625;
  const scRate = settings?.serviceChargeRate ?? 0.18;
  const guests = input.event.guestCount ?? input.req?.guestCount ?? 20;
  const lineItems: QuoteLineItem[] = [];

  if (input.pkg) {
    const packageTotal = estimatePackageTotal(input.pkg, guests);
    lineItems.push({
      code: input.pkg.code,
      label: `${input.pkg.name} (${guests} guests)`,
      qty: 1,
      unitPrice: packageTotal,
      total: packageTotal,
    });
    const wanted = new Set(input.addonCodes ?? []);
    if (input.req?.needs?.cake) wanted.add("cake");
    if (input.req?.needs?.decorations) wanted.add("decor");
    if (input.req?.needs?.dj) wanted.add("dj");
    if (input.req?.needs?.photography) wanted.add("photo");
    if (input.req?.needs?.projector) wanted.add("projector");
    if (input.req?.needs?.music) wanted.add("music");
    if (input.req?.needs?.kids) wanted.add("kids");
    if (input.event.serviceMode === "delivery" || input.req?.serviceMode === "delivery") {
      wanted.add("delivery");
    }
    for (const addon of input.pkg.addons) {
      if (wanted.has(addon.code)) {
        const qty = addon.code === "kids" ? Math.max(1, Math.ceil(guests * 0.2)) : 1;
        const total = addon.price * qty;
        lineItems.push({
          code: addon.code,
          label: addon.label,
          qty,
          unitPrice: addon.price,
          total,
        });
      }
    }
  } else {
    const fallback = Math.max(guests, 20) * 30;
    lineItems.push({
      code: "CUSTOM",
      label: "Custom catering estimate",
      qty: 1,
      unitPrice: fallback,
      total: fallback,
    });
  }

  const subtotal = roundMoney(lineItems.reduce((s, i) => s + i.total, 0));
  const discount = roundMoney(input.discount ?? 0);
  const taxable = Math.max(0, subtotal - discount);
  const serviceCharge = roundMoney(taxable * scRate);
  const tax = roundMoney((taxable + serviceCharge) * taxRate);
  const deliveryFee = roundMoney(
    input.deliveryFee ??
      (input.event.serviceMode === "delivery" || input.req?.serviceMode === "delivery" ? 75 : 0),
  );
  const grandTotal = roundMoney(taxable + serviceCharge + tax + deliveryFee);

  return { lineItems, subtotal, tax, serviceCharge, deliveryFee, discount, grandTotal };
}

export async function createOrReviseQuote(
  input: QuoteBuildInput & { revise?: boolean },
): Promise<EventQuote | null> {
  const totals = await buildQuoteTotals(input);
  const existing = await getLatestQuote(input.event.id);

  if (existing && input.revise) {
    const nextVersion = existing.version + 1;
    await insertQuoteVersion({
      quoteId: existing.id,
      version: existing.version,
      snapshot: { ...existing },
      comment: "Revision before update",
    });
    const updated = await updateQuote(existing.id, {
      version: nextVersion,
      packageId: input.pkg?.id ?? existing.packageId,
      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      serviceCharge: totals.serviceCharge,
      deliveryFee: totals.deliveryFee,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      approvalStatus: "draft",
      notes: input.notes ?? existing.notes,
    });
    if (updated) {
      await insertDocument({
        eventId: input.event.id,
        docType: "quote",
        title: `Quotation v${updated.version}`,
        content: formatQuotePdfText(updated, input.event),
        version: updated.version,
      });
    }
    return updated;
  }

  if (existing && !input.revise) return existing;

  const created = await insertQuote({
    eventId: input.event.id,
    locationId: input.event.locationId,
    version: 1,
    packageId: input.pkg?.id ?? null,
    ...totals,
    approvalStatus: "draft",
    notes: input.notes ?? null,
  });
  if (created) {
    await insertQuoteVersion({
      quoteId: created.id,
      version: 1,
      snapshot: { ...created },
      comment: "Initial quotation",
    });
    await insertDocument({
      eventId: input.event.id,
      docType: "quote",
      title: `Quotation v${created.version}`,
      content: formatQuotePdfText(created, input.event),
      version: created.version,
    });
  }
  return created;
}

export function formatQuotePdfText(quote: EventQuote, event: EventRecord): string {
  const lines = [
    "DESI DHAMAKA — CATERING QUOTATION",
    "================================",
    `Event: ${event.title}`,
    `Type: ${event.eventType}`,
    `Date: ${event.eventDate ?? "TBD"} ${event.eventTime ?? ""}`.trim(),
    `Guests: ${event.guestCount ?? "TBD"}`,
    `Quote version: ${quote.version}`,
    `Status: ${quote.approvalStatus}`,
    "",
    "Line items:",
    ...quote.lineItems.map(
      (i) => `  - ${i.label} x${i.qty} @ $${i.unitPrice.toFixed(2)} = $${i.total.toFixed(2)}`,
    ),
    "",
    `Subtotal: $${quote.subtotal.toFixed(2)}`,
    `Discount: -$${quote.discount.toFixed(2)}`,
    `Service charge: $${quote.serviceCharge.toFixed(2)}`,
    `Tax: $${quote.tax.toFixed(2)}`,
    `Delivery: $${quote.deliveryFee.toFixed(2)}`,
    `GRAND TOTAL: $${quote.grandTotal.toFixed(2)}`,
    "",
    quote.notes ? `Notes: ${quote.notes}` : "",
    "This quotation is PDF-ready for manager / customer review.",
  ];
  return lines.filter(Boolean).join("\n");
}
