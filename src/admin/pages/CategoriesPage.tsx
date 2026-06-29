import { useState } from "react";
import { FolderOpen, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminButton from "../components/ui/Button";
import AdminModal, { ModalFooter } from "../components/ui/Modal";
import AdminInput from "../components/ui/Input";
import { useAdminTheme } from "../context/AdminThemeContext";
import { MOCK_CATEGORIES } from "../data/mock";

export default function CategoryManagementPage() {
  const { dark } = useAdminTheme();
  const [categories] = useState(MOCK_CATEGORIES);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Categories" }]} />
      <PageHeader
        title="Category Management"
        description="Organize your menu into categories."
        actionLabel="Add Category"
        onAction={() => setModalOpen(true)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <AdminCard className="group overflow-hidden p-0 hover:shadow-admin-lg transition-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-3 left-3 text-lg font-semibold text-white">{cat.name}</p>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className={`text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                  {cat.itemCount} items
                </span>
                <div className="flex gap-1">
                  <AdminButton variant="ghost" size="sm" aria-label="Edit">
                    <Pencil size={14} />
                  </AdminButton>
                  <AdminButton variant="ghost" size="sm" aria-label="Delete">
                    <Trash2 size={14} className="text-admin-danger" />
                  </AdminButton>
                </div>
              </div>
            </AdminCard>
          </motion.div>
        ))}
      </div>

      {categories.length === 0 && (
        <AdminCard>
          <div className="flex flex-col items-center py-12">
            <FolderOpen size={32} className="text-admin-muted" />
            <p className="mt-3 text-sm">No categories yet</p>
          </div>
        </AdminCard>
      )}

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Category"
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onConfirm={() => setModalOpen(false)} />}
      >
        <div className="space-y-4">
          <AdminInput label="Category Name" placeholder="Biryani" />
          <div className={`rounded-xl border-2 border-dashed p-8 text-center ${dark ? "border-admin-border-dark" : "border-admin-border"}`}>
            <p className={`text-sm ${dark ? "text-white/40" : "text-admin-muted"}`}>Drop image here or click to upload</p>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
