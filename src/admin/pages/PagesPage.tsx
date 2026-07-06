import { useCallback, useEffect, useMemo, useState } from "react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminToast from "../components/ui/Toast";
import PageContentSectionPanel from "../components/pageContent/PageContentSectionPanel";
import PageSeoPanel from "../components/seo/PageSeoPanel";
import HomepagePageSkeleton from "../components/settings/HomepagePageSkeleton";
import { ADMIN_PAGES_TAB_ORDER, PAGE_CONTENT_TO_SEO_KEY } from "../config/pageContentAdmin";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import {
  getPageContentSectionsForPage,
  type PageContentPageKey,
} from "../../config/pageContentSchema";

const SEO_TAB_KEY = "__seo__";

export default function PagesManagementPage() {
  const { dark } = useAdminTheme();
  const { isAllLocations } = useLocation();
  const [activePage, setActivePage] = useState<PageContentPageKey>("about");
  const [activeSection, setActiveSection] = useState("");
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const pageSections = useMemo(
    () => getPageContentSectionsForPage(activePage),
    [activePage],
  );
  const seoPageKey = PAGE_CONTENT_TO_SEO_KEY[activePage];

  const navItems = useMemo(() => {
    const items = pageSections.map((section) => ({ key: section.section, label: section.label }));
    if (seoPageKey) {
      items.push({ key: SEO_TAB_KEY, label: "SEO" });
    }
    return items;
  }, [pageSections, seoPageKey]);

  useEffect(() => {
    if (navItems.length === 0) {
      setActiveSection("");
      return;
    }
    if (!navItems.some((item) => item.key === activeSection)) {
      setActiveSection(navItems[0].key);
    }
  }, [activeSection, navItems]);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

  if (isAllLocations) {
    return (
      <div>
        <AdminBreadcrumbs
          items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Pages" }]}
        />
        <PageHeader
          title="Pages"
          description="Edit copy for About, Menu, Offers, and other public pages."
        />
        <AdminCard>
          <p className="text-sm text-admin-muted">
            Select a single location in the header to edit page content for that branch.
          </p>
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <AdminBreadcrumbs
        items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Pages" }]}
      />
      <PageHeader
        title="Pages"
        description="Edit copy for About, Menu, Offers, and other public pages."
      />

      <AdminCard padding="sm" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {ADMIN_PAGES_TAB_ORDER.map((tab) => (
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

      {navItems.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-admin-muted">No sections configured for this page.</p>
        </AdminCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <AdminCard padding="sm">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={[
                    "w-full rounded-xl px-4 py-3 text-left text-sm transition-colors",
                    activeSection === item.key
                      ? "bg-admin-primary text-white"
                      : dark
                        ? "hover:bg-white/5"
                        : "hover:bg-admin-ivory",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </AdminCard>

          {activeSection === SEO_TAB_KEY && seoPageKey ? (
            <PageSeoPanel pageKey={seoPageKey} onToast={showToast} />
          ) : activeSection ? (
            <PageContentSectionPanel
              page={activePage}
              section={activeSection}
              onToast={showToast}
            />
          ) : (
            <HomepagePageSkeleton />
          )}
        </div>
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
