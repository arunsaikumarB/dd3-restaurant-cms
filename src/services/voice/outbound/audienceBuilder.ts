import { listCustomers } from "../../restaurantOperations/crm";
import { listReservationsForDate } from "../../restaurantOperations/reservations";
import type { AudienceFilter, AudienceMember } from "./types";

/**
 * Builds outbound audience from CRM + Reservation Engine — no duplicate customer DB.
 */
export async function buildAudience(input: {
  locationId: string;
  filter: AudienceFilter;
  limit?: number;
}): Promise<AudienceMember[]> {
  const filter = input.filter;
  const limit = input.limit ?? 100;

  if (filter.phones?.length) {
    return filter.phones.map((phone) => ({
      customerId: null,
      name: "Guest",
      phone,
      email: null,
      language: filter.language ?? "en",
      isVip: false,
      locationId: input.locationId,
      vars: {},
    }));
  }

  const customers = await listCustomers({
    locationId: filter.preferredOutlet || filter.locationId || input.locationId,
    vipOnly: filter.vipOnly,
    segment: filter.segment,
    limit,
  });

  let members: AudienceMember[] = customers
    .filter((c) => Boolean(c.phone))
    .map((c) => ({
      customerId: c.id,
      name: `${c.firstName} ${c.lastName}`.trim() || c.preferredName || "Guest",
      phone: c.phone!,
      email: c.email,
      language: c.preferredLanguage || filter.language || "en",
      isVip: c.isVip,
      locationId: c.locationId,
      vars: {},
    }));

  if (filter.minVisits != null) {
    members = members.filter((m) => {
      const c = customers.find((x) => x.id === m.customerId);
      return (c?.visitCount ?? 0) >= filter.minVisits!;
    });
  }

  if (filter.minDaysSinceVisit != null || filter.maxDaysSinceVisit != null) {
    const now = Date.now();
    members = members.filter((m) => {
      const c = customers.find((x) => x.id === m.customerId);
      if (!c?.lastVisit) return (filter.minDaysSinceVisit ?? 0) > 0;
      const days = (now - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
      if (filter.minDaysSinceVisit != null && days < filter.minDaysSinceVisit) return false;
      if (filter.maxDaysSinceVisit != null && days > filter.maxDaysSinceVisit) return false;
      return true;
    });
  }

  if (filter.birthdayMonth != null) {
    members = members.filter((m) => {
      const c = customers.find((x) => x.id === m.customerId);
      if (!c?.dateOfBirth) return false;
      return new Date(c.dateOfBirth).getMonth() + 1 === filter.birthdayMonth;
    });
  }

  if (filter.anniversaryMonth != null) {
    members = members.filter((m) => {
      const c = customers.find((x) => x.id === m.customerId);
      if (!c?.anniversary) return false;
      return new Date(c.anniversary).getMonth() + 1 === filter.anniversaryMonth;
    });
  }

  if (filter.language) {
    members = members.filter((m) => m.language === filter.language);
  }

  if (filter.hasUpcomingReservation || filter.reservationDate) {
    const date = filter.reservationDate ?? tomorrowIso();
    const reservations = await listReservationsForDate(input.locationId, date);
    const byPhone = new Map(
      reservations
        .filter((r) => r.status !== "cancelled")
        .map((r) => [r.phone.replace(/\D/g, ""), r]),
    );

    if (filter.hasUpcomingReservation || filter.reservationDate) {
      const fromRes: AudienceMember[] = [];
      for (const r of reservations) {
        if (r.status === "cancelled") continue;
        fromRes.push({
          customerId: null,
          name: r.customerName,
          phone: r.phone,
          email: r.email,
          language: filter.language ?? "en",
          isVip: false,
          locationId: input.locationId,
          reservationId: r.id,
          confirmationCode: r.confirmationCode,
          reservationDate: r.date,
          reservationTime: r.time,
          guests: r.guests,
          vars: {
            date: r.date,
            time: r.time,
            guests: String(r.guests),
            confirmationCode: r.confirmationCode ?? "",
          },
        });
      }
      if (fromRes.length) return fromRes.slice(0, limit);

      members = members.filter((m) => byPhone.has(m.phone.replace(/\D/g, "")));
      members = members.map((m) => {
        const r = byPhone.get(m.phone.replace(/\D/g, ""));
        if (!r) return m;
        return {
          ...m,
          reservationId: r.id,
          confirmationCode: r.confirmationCode,
          reservationDate: r.date,
          reservationTime: r.time,
          guests: r.guests,
          vars: {
            date: r.date,
            time: r.time,
            guests: String(r.guests),
            confirmationCode: r.confirmationCode ?? "",
          },
        };
      });
    }
  }

  if (filter.customerIds?.length) {
    const set = new Set(filter.customerIds);
    members = members.filter((m) => m.customerId && set.has(m.customerId));
  }

  return members.slice(0, limit);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
