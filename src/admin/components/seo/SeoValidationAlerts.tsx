import { AlertTriangle } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import type { SeoValidationIssue } from "../../../types/seoMetadata";

type Props = {
  issues: SeoValidationIssue[];
};

export default function SeoValidationAlerts({ issues }: Props) {
  const { dark } = useAdminTheme();
  if (issues.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {issues.map((issue) => (
        <div
          key={issue.id}
          className={[
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
            issue.severity === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : dark
                ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                : "border-amber-200 bg-amber-50 text-amber-900",
          ].join(" ")}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
