import { motion } from "framer-motion";
import { EASE_POWER3 } from "../showcase/motion";

export default function MenuHero() {
  return (
    <section
      className="relative flex min-h-[80vh] items-center justify-center overflow-hidden pt-20"
      aria-labelledby="menu-hero-title"
    >
      <img
        src="/showcase/biryani.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
        loading="eager"
        fetchPriority="high"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/75"
        aria-hidden
      />

      <motion.div
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE_POWER3 }}
      >
        <p className="mb-5 text-[12px] font-semibold uppercase tracking-label text-saffron">
          Desi Dhamaka
        </p>
        <h1
          id="menu-hero-title"
          className="font-serif text-[clamp(3rem,10vw,6.5rem)] font-semibold leading-[0.95] tracking-tight text-white"
        >
          Menu
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[clamp(16px,2vw,20px)] leading-relaxed text-white/75">
          Discover authentic Indian flavours crafted with tradition, premium
          ingredients and unforgettable taste.
        </p>
      </motion.div>
    </section>
  );
}
