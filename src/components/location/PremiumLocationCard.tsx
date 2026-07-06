import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { LocationConfig, LocationId } from "../../config/locations";
import { locPath } from "../../utils/locationPaths";

type Props = {
  config: LocationConfig;
  image: string;
  onSelect: (id: LocationId) => void;
};

export default function PremiumLocationCard({ config, image, onSelect }: Props) {
  return (
    <Link
      to={locPath(config.id, "/")}
      onClick={() => onSelect(config.id)}
      aria-label={`Continue to Desi Dhamaka ${config.name} — ${config.address}.`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/10 text-left shadow-[0_18px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:border-brand-primary/70 hover:bg-white/[0.14] hover:shadow-[0_30px_70px_-24px_rgba(237,60,24,0.55)] focus:outline-none focus-visible:-translate-y-2 focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa"
    >
      {/* Storefront image */}
      <div className="relative h-[180px] w-full overflow-hidden rounded-t-3xl md:h-[200px] xl:h-[220px]">
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
        />
        <div className="absolute inset-0" aria-hidden />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-serif text-xl mb-3 font-semibold text-white">{config.name}</h2>
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-primary"
            aria-hidden
          >
            <MapPin size={18} strokeWidth={2} />
          </span>
          <p className="text-sm leading-relaxed text-white/65">
            {config.address.split(",")[0]}
            <br />
            {config.address.split(",").slice(1).join(",").trim()}
          </p>
        </div>
        <span
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors duration-300 group-hover:bg-[#d43415]"
          aria-hidden
        >
          Continue
          <ArrowRight
            size={18}
            className="transition-transform duration-300 group-hover:translate-x-1.5"
          />
        </span>
      </div>
    </Link>
  );
}