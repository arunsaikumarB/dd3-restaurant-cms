import { buildChefGaaMenuUrl } from "../../constants/ordering";
import { useLocationOrderUrl } from "../../demo/menuExperience";
import { formatPrice } from "../../utils/menu";
import type { MenuItem } from "../../types/menu";

export interface MenuCardProps {
  item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
  const orderBaseUrl = useLocationOrderUrl();
  const cartUrl = buildChefGaaMenuUrl(item.category, item.name, { baseUrl: orderBaseUrl });
  const hasDescription = item.description.trim().length > 0;

  return (
    <article
      className="group flex h-full flex-col rounded-[20px] border border-transparent bg-white p-6 shadow-card transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:hover:scale-[1.02] md:hover:border-saffron/30 md:hover:shadow-card-hover focus-within:border-saffron/40 focus-within:shadow-card-hover"
      aria-label={`${item.name}, ${formatPrice(item.price)}`}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-[clamp(1.1rem,1.8vw,1.3rem)] font-semibold leading-snug text-cocoa">
              {item.name}
            </h3>
            {item.featured && (
              <span className="shrink-0 rounded-full bg-saffron/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-saffron">
                Chef&apos;s Special
              </span>
            )}
          </div>
        </div>
        <p className="shrink-0 rounded-full bg-cocoa/8 px-3 py-1 font-sans text-[0.975rem] font-bold tabular-nums text-cocoa">
          {formatPrice(item.price)}
        </p>
      </div>

      <span className="mb-3 block h-px w-8 rounded-full bg-saffron/40 transition-all duration-300 group-hover:w-12 group-hover:bg-saffron/60" aria-hidden />

      {hasDescription ? (
        <p className="mb-5 text-[14px] leading-[1.7] text-cocoa/55">{item.description}</p>
      ) : (
        <span className="mb-5 block sr-only">No description available</span>
      )}

      <div className="mt-auto pt-1">
        <a
          href={cartUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#2b1d18] bg-transparent px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2b1d18] transition-colors duration-300 hover:bg-[#2b1d18] hover:text-ivory focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
        >
          Add to Cart
        </a>
      </div>
    </article>
  );
}
