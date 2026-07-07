import type { ReactNode } from "react";

type CardShellProps = {
  emoji: string;
  title: string;
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

export function CardShell({ emoji, title, children, className = "", delayMs = 0 }: CardShellProps) {
  return (
    <article
      className={`cheffy-card ${className}`.trim()}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <header className="cheffy-card__header">
        <span className="cheffy-card__emoji" aria-hidden="true">
          {emoji}
        </span>
        <h4 className="cheffy-card__title">{title}</h4>
      </header>
      <div className="cheffy-card__body">{children}</div>
    </article>
  );
}
