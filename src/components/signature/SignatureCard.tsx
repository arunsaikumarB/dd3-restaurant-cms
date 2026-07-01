import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { SignatureDish } from "../../data/signatureDishes";
import {
  buildChefGaaMenuUrl,
  EXTERNAL_ORDER_LINK_PROPS,
} from "../../constants/ordering";
import {
  DEFAULT_SHOWCASE_IMAGE,
  pickSignatureImage,
} from "../../services/signaturePublic";

export interface SignatureCardProps {
  dish: SignatureDish;
  orderBaseUrl: string;
  entranceDelay?: number;
  entranceVisible?: boolean;
}

function DishIcon({ category }: { category: string }) {
  const lower = category.toLowerCase();
  if (lower.includes("biryani") || lower.includes("mandi")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3c-4 2-7 5-7 9a7 7 0 0014 0c0-4-3-7-7-9z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M8 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (lower.includes("kebab") || lower.includes("tandoori")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 18l3-12M12 18l3-12M18 18l-3-12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (lower.includes("appetizer")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.8 5.7 21l2.3-7-6-4.6h7.6L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignatureCardComponent({
  dish,
  orderBaseUrl,
  entranceDelay = 0,
  entranceVisible = true,
}: SignatureCardProps) {
  const fallbackSrc = useMemo(
    () => pickSignatureImage(null, dish.category, dish.name),
    [dish.category, dish.name],
  );
  const [imageSrc, setImageSrc] = useState(
    () => pickSignatureImage(dish.image, dish.category, dish.name),
  );

  useEffect(() => {
    setImageSrc(pickSignatureImage(dish.image, dish.category, dish.name));
  }, [dish.id, dish.image, dish.category, dish.name]);

  const orderUrl = useMemo(
    () =>
      buildChefGaaMenuUrl(dish.category_name, dish.item_name, {
        baseUrl: orderBaseUrl,
      }),
    [dish.category_name, dish.item_name, orderBaseUrl],
  );

  const handleImageError = useCallback(() => {
    setImageSrc((current) =>
      current === fallbackSrc ? DEFAULT_SHOWCASE_IMAGE : fallbackSrc,
    );
  }, [fallbackSrc]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={entranceVisible ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{
        duration: 0.65,
        delay: entranceDelay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <a
        href={orderUrl}
        className="signature-card"
        aria-label={`Order ${dish.item_name} online`}
        {...EXTERNAL_ORDER_LINK_PROPS}
      >
        <div className="signature-card__border" aria-hidden />
        <div className="signature-card__image-wrap">
          <img
            src={imageSrc}
            alt={dish.name}
            className="signature-card__image"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 85vw, 280px"
            draggable={false}
            onError={handleImageError}
          />
          <div className="signature-card__overlay" aria-hidden />
        </div>
        <div className="signature-card__content">
          <div className="signature-card__badge-row">
            <span className="text-saffron" aria-hidden>
              <DishIcon category={dish.category} />
            </span>
            {dish.badge && (
              <span className="signature-card__badge">{dish.badge}</span>
            )}
          </div>
          <h3 className="signature-card__name">{dish.name}</h3>
          <p className="signature-card__category">{dish.category}</p>
          <span className="signature-card__divider" aria-hidden />
          <p className="signature-card__price">${dish.price.toFixed(2)}</p>
        </div>
      </a>
    </motion.div>
  );
}

const SignatureCard = memo(SignatureCardComponent);

SignatureCard.displayName = "SignatureCard";

export default SignatureCard;
