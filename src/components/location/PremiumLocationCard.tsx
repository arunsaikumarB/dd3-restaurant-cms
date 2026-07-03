import { ArrowRight, MapPin, Star } from "lucide-react";
import type { LocationConfig, LocationId } from "../../config/locations";

type Props = {
  config: LocationConfig;
  image: string;
  /** Placeholder Google rating shown until real ratings are wired up. */
  rating?: number;
  onSelect: (id: LocationId) => void;
};

const FEATURES = ["Order Online", "Reservations", "Catering", "Offers"] as const;

/** Sun=0 … Sat=6 → which openingHours band applies for that weekday. */
function bandForToday(hours: LocationConfig["openingHours"]): string {
  const day = new Date().getDay();
  if (day === 0) return hours.sunday;
  if (day === 5 || day === 6) return hours.weekend;
  return hours.weekday;
}

function parseMinutes(value: string): number | null {
  const match = value.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (/PM/i.test(match[3])) hour += 12;
  return hour * 60 + Number(match[2]);
}

function isOpenNow(hours: LocationConfig["openingHours"]): boolean {
  const band = bandForToday(hours);
  const [open, close] = band.split("-");
  const openMin = parseMinutes(open ?? "");
  const closeMin = parseMinutes(close ?? "");
  if (openMin == null || closeMin == null) return false;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return closeMin > openMin
    ? nowMin >= openMin && nowMin < closeMin
    : nowMin >= openMin || nowMin < closeMin;
}

export default function PremiumLocationCard({
  config,
  image,
  rating = 4.8,
  onSelect,
}: Props) {
  const open = isOpenNow(config.openingHours);

  return (
    <button
      type="button"
      onClick={() => onSelect(config.id)}
      aria-label={`Continue to Desi Dhamaka ${config.name} — ${config.address}. ${open ? "Open now" : "Currently closed"}.`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/10 text-left shadow-[0_18px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:border-brand-primary/70 hover:bg-white/[0.14] hover:shadow-[0_30px_70px_-24px_rgba(237,60,24,0.55)] focus:outline-none focus-visible:-translate-y-2 focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa"
    >
      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden">
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa/90 via-cocoa/25 to-transparent" aria-hidden />

        <span
          className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
          aria-hidden
        >
          <Star size={12} className="fill-saffron text-saffron" />
          {rating.toFixed(1)}
          <span className="font-normal text-white/70">Google</span>
        </span>

        <span
          className={
            "absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur-sm " +
            (open ? "bg-emerald-500/25 text-emerald-100" : "bg-rose-500/25 text-rose-100")
          }
          aria-hidden
        >
          <span className={"h-1.5 w-1.5 rounded-full " + (open ? "bg-emerald-300" : "bg-rose-300")} />
          {open ? "Open" : "Closed"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-primary"
            aria-hidden
          >
            <MapPin size={18} strokeWidth={2} />
          </span>
          <h2 className="font-serif text-xl font-semibold text-white">{config.name}</h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-white/65">{config.address}</p>

        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Available here">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/75"
            >
              {feature}
            </li>
          ))}
        </ul>

        <span
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors duration-300 group-hover:bg-[#d43415]"
          aria-hidden
        >
          Continue
          <ArrowRight
            size={18}
            className="transition-transform duration-300 group-hover:translate-x-1.5"
          />
        </span>
      </div>
    </button>
  );
}
