import type { ImgHTMLAttributes } from "react";

export interface ResponsiveImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  src: string;
  alt: string;
  /** When true, loads immediately (hero / above-the-fold). */
  priority?: boolean;
  sizes?: string;
}

/**
 * Lazy image with sensible defaults. Pass `srcSet` when multiple widths exist.
 */
export default function ResponsiveImage({
  src,
  alt,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px",
  decoding = "async",
  ...rest
}: ResponsiveImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding={decoding}
      sizes={rest.srcSet ? sizes : undefined}
      {...rest}
    />
  );
}
