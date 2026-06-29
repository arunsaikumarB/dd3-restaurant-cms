export interface NavigationArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
}

export default function NavigationArrows({
  onPrev,
  onNext,
  canScrollPrev,
  canScrollNext,
}: NavigationArrowsProps) {
  return (
    <>
      <div className="signature-nav signature-nav--prev">
        <button
          type="button"
          className="signature-nav__btn"
          onClick={onPrev}
          disabled={!canScrollPrev}
          aria-label="Previous dish"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="signature-nav signature-nav--next">
        <button
          type="button"
          className="signature-nav__btn"
          onClick={onNext}
          disabled={!canScrollNext}
          aria-label="Next dish"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </>
  );
}
