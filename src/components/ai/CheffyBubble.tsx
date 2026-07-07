import { useEffect, useRef, useState } from "react";

type CheffyBubbleProps = {
  text: string;
  /** Whether to animate the text as if typed. */
  typed?: boolean;
  onClose?: () => void;
};

/** The floating speech bubble Cheffy uses for greetings & nudges. */
export function CheffyBubble({ text, typed = true, onClose }: CheffyBubbleProps) {
  const [shown, setShown] = useState(typed ? "" : text);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!typed) {
      setShown(text);
      return;
    }
    let i = 0;
    setShown("");
    const step = () => {
      i += 1;
      setShown(text.slice(0, i));
      if (i < text.length) timerRef.current = setTimeout(step, 22);
    };
    step();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, typed]);

  return (
    <div className="cheffy-bubble" role="status">
      {onClose && (
        <button
          type="button"
          className="cheffy-bubble__close"
          onClick={onClose}
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
      <p className="cheffy-bubble__text">{shown}</p>
      <span className="cheffy-bubble__tail" aria-hidden="true" />
    </div>
  );
}
