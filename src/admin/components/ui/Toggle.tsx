import { useAdminTheme } from "../../context/AdminThemeContext";

interface AdminToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function AdminToggle({ checked, onChange, label }: AdminToggleProps) {
  const { dark } = useAdminTheme();
  return (
    <label className="inline-flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 rounded-full transition-colors duration-300",
          checked ? "bg-admin-primary" : dark ? "bg-white/20" : "bg-admin-border",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}
