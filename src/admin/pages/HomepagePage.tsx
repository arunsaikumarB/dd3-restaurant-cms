import { useState } from "react";
import { motion } from "framer-motion";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminButton from "../components/ui/Button";
import { useAdminTheme } from "../context/AdminThemeContext";
import { HOMEPAGE_SECTIONS } from "../data/mock";

export default function HomepageManagementPage() {
  const { dark } = useAdminTheme();
  const [sections, setSections] = useState(HOMEPAGE_SECTIONS);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const active = sections.find((s) => s.id === activeId);

  const updateField = (sectionId: string, key: string, value: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.map((f) => (f.key === key ? { ...f, value } : f)) }
          : s,
      ),
    );
  };

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", path: "/admin/dashboard" },
          { label: "Homepage" },
        ]}
      />
      <PageHeader
        title="Homepage Management"
        description="Edit hero, featured sections, and footer content."
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <AdminCard padding="sm">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveId(section.id)}
                className={[
                  "w-full rounded-xl px-4 py-3 text-left text-sm transition-colors",
                  activeId === section.id
                    ? "bg-admin-primary text-white"
                    : dark ? "hover:bg-white/5" : "hover:bg-admin-ivory",
                ].join(" ")}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </AdminCard>

        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdminCard>
              <h2 className="text-lg font-semibold">{active.label}</h2>
              <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                {active.description}
              </p>
              <div className="mt-6 space-y-4">
                {active.fields.map((field) =>
                  field.type === "textarea" ? (
                    <AdminTextarea
                      key={field.key}
                      label={field.label}
                      value={field.value}
                      onChange={(e) => updateField(active.id, field.key, e.target.value)}
                    />
                  ) : (
                    <AdminInput
                      key={field.key}
                      label={field.label}
                      value={field.value}
                      onChange={(e) => updateField(active.id, field.key, e.target.value)}
                    />
                  ),
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <AdminButton variant="outline">Discard</AdminButton>
                <AdminButton>Save Changes</AdminButton>
              </div>
            </AdminCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
