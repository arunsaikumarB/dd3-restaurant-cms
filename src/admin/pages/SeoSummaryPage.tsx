import { useState } from "react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import PageSeoPanel from "../components/seo/PageSeoPanel";
import AdminCard from "../components/ui/Card";
import AdminToast from "../components/ui/Toast";
import { SEO_PAGE_TABS, SEO_SUMMARY_SECTIONS } from "../config/seoPages";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import type { SeoPageKey } from "../../types/seoMetadata";

export default function SeoSummaryPage() {
  const { dark } = useAdminTheme();
  const { isAllLocations } = useLocation();
  const [activePage, setActivePage] = useState<SeoPageKey>("homepage");
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const showToast = (message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  };

  return (
    <div>
      <AdminBreadcrumbs
        items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "SEO Summary" }]}
      />
      <PageHeader
        title="SEO Summary"
        description="Site-wide local business details and a live search-result preview for each page."
      />

      {isAllLocations ? (
        <AdminCard>
          <p className="text-sm text-admin-muted">
            Select a single location in the header to view SEO summary for that branch.
          </p>
        </AdminCard>
      ) : (
        <>
          <AdminCard padding="sm" className="mb-6">
            <div className="flex flex-wrap gap-2">
              {SEO_PAGE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActivePage(tab.key)}
                  className={[
                    "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                    activePage === tab.key
                      ? "bg-admin-primary text-white"
                      : dark
                        ? "text-white/70 hover:bg-white/5"
                        : "text-admin-muted hover:bg-admin-ivory",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </AdminCard>

          <PageSeoPanel pageKey={activePage} onToast={showToast} sections={SEO_SUMMARY_SECTIONS} />
        </>
      )}

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
