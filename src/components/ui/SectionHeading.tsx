import AnimatedContainer from "./AnimatedContainer";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  dark?: boolean;
}

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  dark = false,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <AnimatedContainer className={`max-w-3xl ${alignClass}`}>
      {eyebrow && (
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-saffron">
          {eyebrow}
        </p>
      )}
      <h2
        className={
          "font-serif text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.06] tracking-tight " +
          (dark ? "text-ivory" : "text-cocoa")
        }
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={
            "mt-5 max-w-2xl text-[16px] leading-[1.75] " +
            (dark ? "text-ivory/65" : "text-cocoa/58") +
            (align === "center" ? " mx-auto" : "")
          }
        >
          {subtitle}
        </p>
      )}
      <span
        className={
          "mt-7 block h-px rounded-full bg-gradient-to-r from-saffron/70 to-transparent " +
          (align === "center" ? "mx-auto w-20" : "w-16")
        }
        aria-hidden
      />
    </AnimatedContainer>
  );
}
