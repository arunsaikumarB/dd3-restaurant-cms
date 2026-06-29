interface SectionPlaceholderProps {
  label?: string;
  minHeight?: string;
  dark?: boolean;
}

export default function SectionPlaceholder({
  label = "Loading section",
  minHeight = "40vh",
  dark = false,
}: SectionPlaceholderProps) {
  return (
    <div
      className={
        "section-placeholder" + (dark ? " section-placeholder--dark" : "")
      }
      style={{ minHeight }}
      aria-busy="true"
      aria-label={label}
    >
      <div className="section-placeholder__bar">
        <div className="section-placeholder__fill" />
      </div>
    </div>
  );
}
