import { useState } from "react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import PageSeoPanel from "../components/seo/PageSeoPanel";
import AdminCard from "../components/ui/Card";
import AdminToast from "../components/ui/Toast";
import { SEO_SUMMARY_SECTIONS } from "../config/seoPages";
import { useLocation } from "../hooks/useLocation";

export default function SeoSummaryPage() {
  const { isAllLocations } = useLocation();
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
        description="Site-wide local business details used across every page's SEO metadata."
      />

      {isAllLocations ? (
        <AdminCard>
          <p className="text-sm text-admin-muted">
            Select a single location in the header to view SEO summary for that branch.
          </p>
        </AdminCard>
      ) : (
        <PageSeoPanel
          pageKey="homepage"
          onToast={showToast}
          sections={SEO_SUMMARY_SECTIONS}
          showValidation={false}
        />
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
