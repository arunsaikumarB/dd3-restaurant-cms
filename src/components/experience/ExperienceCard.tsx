import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";

const EASE_PREMIUM = "cubic-bezier(0.22, 1, 0.36, 1)";

export interface ExperienceCardProps {
  label?: string;
  title: string;
  headline?: string;
  subtitle?: string;
  image: string;
  buttonText: string;
  link: string;
  external?: boolean;
  rotation: {
    rotateY: number;
    rotateZ: number;
    scale?: number;
    translateY?: number;
  };
  isCenter?: boolean;
  scrollDelay?: number;
  visible?: boolean;
  flat?: boolean;
  onActivate?: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ExperienceCard({
  label,
  title,
  headline,
  subtitle,
  image,
  buttonText,
  link,
  external = false,
  rotation,
  isCenter = false,
  scrollDelay = 0,
  visible = true,
  flat = false,
  onActivate,
}: ExperienceCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (flat) return;
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: clamp(-py * 12, -6, 6),
        y: clamp(px * 12, -6, 6),
      });
    },
    [flat]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const baseScale = rotation.scale ?? 1;
  const baseY = rotation.translateY ?? 0;

  let scale = baseScale;
  let translateY = baseY;
  let rotateY = rotation.rotateY;
  let rotateZ = rotation.rotateZ;

  if (!flat && isHovered) {
    scale = baseScale * 1.06;
    translateY = baseY - 28;
    rotateY *= 0.25;
    rotateZ *= 0.25;
  }

  const transform = flat
    ? `translate3d(0, ${visible ? 0 : 80}px, 0) scale(${visible ? 1 : 0.92})`
    : `translate3d(0, ${translateY + (visible ? 0 : 90)}px, 0) scale(${visible ? scale : scale * 0.88}) rotateX(${tilt.x}deg) rotateY(${rotateY + tilt.y}deg) rotateZ(${rotateZ}deg)`;

  const content = (
    <>
      <div className="experience-card__media" aria-hidden="true">
        <img src={image} alt="" loading="lazy" decoding="async" draggable={false} />
        <div className="experience-card__vignette" />
        <div className="experience-card__shine" />
        <div className="experience-card__gradient" />
        <div className="experience-card__border" />
      </div>

      <div className="experience-card__content">
        <div className="experience-card__body">
          {label && <p className="experience-card__label">{label}</p>}
          {headline ? (
            <h3 className="experience-card__headline">{headline}</h3>
          ) : (
            <h3 className="experience-card__title">{title}</h3>
          )}
          {subtitle && <p className="experience-card__subtitle">{subtitle}</p>}
        </div>

        <span className="experience-card__btn experience-card__btn--solid">
          {buttonText}
          <svg aria-hidden className="experience-card__arrow" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </>
  );

  const className =
    "experience-card group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-4 focus-visible:ring-offset-[#0c0a09] " +
    (isCenter ? "experience-card--center " : "") +
    (isHovered ? "experience-card--active " : "") +
    (flat ? "experience-card--flat " : "");

  const style: React.CSSProperties = {
    transform,
    opacity: visible ? undefined : 0,
    transition: `transform 500ms ${EASE_PREMIUM}, opacity 500ms ${EASE_PREMIUM}, box-shadow 500ms ${EASE_PREMIUM}`,
    transitionDelay: visible ? `${scrollDelay}ms` : "0ms",
    willChange: "transform",
  };

  const handlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: handleMouseLeave,
    onMouseMove: handleMouseMove,
    onFocus: () => setIsHovered(true),
    onBlur: handleMouseLeave,
  };

  const activate = () => {
    onActivate?.();
  };

  if (external || link.startsWith("http")) {
    return (
      <a
        ref={cardRef}
        href={link}
        className={className}
        style={style}
        aria-label={`${headline ?? title} — ${buttonText}`}
        onClick={activate}
        {...handlers}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      ref={cardRef}
      to={link}
      className={className}
      style={style}
      aria-label={`${headline ?? title} — ${buttonText}`}
      onClick={activate}
      {...handlers}
    >
      {content}
    </Link>
  );
}
