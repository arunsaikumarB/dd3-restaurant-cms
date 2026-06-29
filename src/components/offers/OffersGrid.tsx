import { motion } from "framer-motion";
import type { PublicOffer } from "../../services/offersPublic";
import { EASE_POWER3 } from "../showcase/motion";

const FALLBACK_BANNER = "/showcase/biryani.jpg";

interface OffersGridProps {
  offers: PublicOffer[];
}

export default function OffersGrid({ offers }: OffersGridProps) {
  if (offers.length === 0) {
    return (
      <div className="rounded-[24px] border border-cocoa/10 bg-white/60 p-12 text-center">
        <p className="font-serif text-2xl text-cocoa">No active offers</p>
        <p className="mt-3 text-cocoa/60">
          Check back soon for special deals and promotions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {offers.map((offer, index) => (
        <motion.article
          key={offer.id}
          className="group overflow-hidden rounded-[24px] border border-cocoa/5 bg-[#FDFBF7] shadow-[0_8px_32px_-12px_rgba(43,29,24,0.12)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-saffron/30 hover:shadow-[0_24px_56px_-18px_rgba(43,29,24,0.2)]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: EASE_POWER3, delay: index * 0.07 }}
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            <img
              src={offer.banner ?? FALLBACK_BANNER}
              alt={offer.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cocoa/80 via-cocoa/25 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <span className="inline-flex rounded-full bg-saffron px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ivory">
                {offer.discount}
              </span>
              <h3 className="mt-3 font-serif text-[clamp(1.35rem,2.5vw,1.75rem)] leading-snug text-ivory">
                {offer.title}
              </h3>
            </div>
          </div>
          {offer.description ? (
            <div className="p-6">
              <p className="text-[15px] leading-[1.7] text-cocoa/60">{offer.description}</p>
            </div>
          ) : null}
        </motion.article>
      ))}
    </div>
  );
}
