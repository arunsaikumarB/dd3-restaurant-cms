import { motion } from "framer-motion";
import { EASE_POWER3 } from "../showcase/motion";
import { MENU_SCROLL_MARGIN } from "../../constants/navigation";
import { usePageContent } from "../../context/PageContentContext";
import { getCategorySubtitle, DEFAULT_CATEGORY_SUBTITLE_RULES } from "../../utils/menu";
import type { MenuCategory } from "../../types/menu";
import MenuCard from "./MenuCard";

export interface CategorySectionProps {
  category: MenuCategory;
  index: number;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_POWER3 },
  },
};

const cardContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_POWER3 },
  },
};

export default function CategorySection({ category, index }: CategorySectionProps) {
  const { fetchSection } = usePageContent();
  const subtitleRules = fetchSection(
    "menu",
    "category_subtitles",
    DEFAULT_CATEGORY_SUBTITLE_RULES,
  );

  return (
    <motion.section
      id={`category-${category.id}`}
      role="tabpanel"
      aria-labelledby={`heading-${category.id}`}
      style={{ scrollMarginTop: MENU_SCROLL_MARGIN }}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
    >
      <div className="mb-10 md:mb-12">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-label text-saffron">
          {String(index + 1).padStart(2, "0")}
        </p>
        <h2
          id={`heading-${category.id}`}
          className="font-serif text-[clamp(2rem,4vw,3.25rem)] font-semibold tracking-tight text-cocoa"
        >
          {category.name}
        </h2>
        <p className="mt-3 max-w-xl text-[16px] text-cocoa/55">
          {getCategorySubtitle(category.name, subtitleRules)}
        </p>
        <span className="mt-6 block h-px w-16 bg-saffron/60" aria-hidden />
      </div>

      <motion.div
        className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6"
        variants={cardContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
      >
        {category.items.map((item) => (
          <motion.div key={item.id} variants={cardVariants}>
            <MenuCard item={item} />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
