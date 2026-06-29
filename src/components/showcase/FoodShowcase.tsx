import AnimatedImage from "./AnimatedImage";
import PrimaryOutlineButton from "./PrimaryOutlineButton";
import SectionHeader from "./SectionHeader";
import {
  buildChefGaaMenuUrl,
  EXTERNAL_ORDER_LINK_PROPS,
} from "../../constants/ordering";

export interface FoodShowcaseProps {
  /** Large elegant heading, e.g. "Chicken Dum Biryani". */
  title: string;
  /** Small uppercase category label. */
  subtitle: string;
  /** Short descriptive paragraph. */
  description: string;
  /** Image URL for the premium food photography. */
  image: string;
  /** Side the image sits on for this section. */
  imagePosition: "left" | "right";
  /** ChefGaa menu category (exact name from online menu). */
  category_name: string;
  /** ChefGaa menu item (exact name from online menu). */
  item_name: string;
  /** CTA label (default "Order Now"). */
  ctaLabel?: string;
}

/**
 * Full-viewport, two-column food showcase section. The layout alternates via
 * `imagePosition`; the content column reveals with a staggered fade-up while
 * the image reveals with a clip-path wipe, gentle scale and parallax.
 */
export default function FoodShowcase({
  title,
  subtitle,
  description,
  image,
  imagePosition,
  category_name,
  item_name,
  ctaLabel = "Order Now",
}: FoodShowcaseProps) {
  const imageLeft = imagePosition === "left";
  const orderUrl = buildChefGaaMenuUrl(category_name, item_name);

  return (
    <section className="flex min-h-screen w-full items-center bg-ivory">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-20 md:px-10 lg:px-16">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Image column (~62%) */}
          <div
            className={
              "w-full lg:w-[62%] " + (imageLeft ? "lg:order-1" : "lg:order-2")
            }
          >
            <a
              href={orderUrl}
              className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
              aria-label={`Order ${item_name} online`}
              {...EXTERNAL_ORDER_LINK_PROPS}
            >
              <AnimatedImage src={image} alt={title} />
            </a>
          </div>

          {/* Content column (~38%) */}
          <div
            className={
              "w-full lg:w-[38%] " + (imageLeft ? "lg:order-2" : "lg:order-1")
            }
          >
            <SectionHeader
              subtitle={subtitle}
              title={title}
              description={description}
            >
              <PrimaryOutlineButton href={orderUrl}>
                {ctaLabel}
              </PrimaryOutlineButton>
            </SectionHeader>
          </div>
        </div>
      </div>
    </section>
  );
}
