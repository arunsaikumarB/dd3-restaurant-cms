import { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminBadge from "../components/ui/Badge";
import AdminSelect from "../components/ui/Select";
import AdminModal from "../components/ui/Modal";
import { useAdminTheme } from "../context/AdminThemeContext";
import { MOCK_GALLERY } from "../data/mock";
import type { GalleryImage } from "../types";

export default function GalleryManagementPage() {
  const { dark } = useAdminTheme();
  const [images, setImages] = useState(MOCK_GALLERY);
  const [preview, setPreview] = useState<GalleryImage | null>(null);
  const [category, setCategory] = useState("all");
  const [dragOver, setDragOver] = useState(false);

  const filtered = category === "all" ? images : images.filter((i) => i.category === category);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Gallery" }]} />
      <PageHeader
        title="Gallery"
        description="Manage restaurant photos and ambiance images."
        actionLabel="Upload"
        onAction={() => {}}
      />

      <div
        className={[
          "mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors",
          dragOver ? "border-admin-primary bg-admin-primary/5" : dark ? "border-admin-border-dark" : "border-admin-border",
        ].join(" ")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
      >
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${dark ? "bg-white/10" : "bg-admin-ivory"}`}>
          <Upload size={22} className="text-admin-primary" />
        </div>
        <p className="text-sm font-medium">Drag & drop images here</p>
        <p className={`mt-1 text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
          PNG, JPG up to 10MB — UI only, no upload
        </p>
      </div>

      <div className="mb-6 w-48">
        <AdminSelect
          label="Filter by category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "all", label: "All Categories" },
            { value: "Food", label: "Food" },
            { value: "Ambiance", label: "Ambiance" },
            { value: "Events", label: "Events" },
            { value: "Kitchen", label: "Kitchen" },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((img, i) => (
          <motion.div
            key={img.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
          >
            <AdminCard className="group overflow-hidden p-0 cursor-pointer" padding="sm">
              <div className="relative aspect-square overflow-hidden rounded-xl">
                <img
                  src={img.url}
                  alt={img.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onClick={() => setPreview(img)}
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex w-full items-center justify-between">
                    <AdminBadge variant="outline" className="!text-white !border-white/30">{img.category}</AdminBadge>
                    <button
                      type="button"
                      className="rounded-lg bg-admin-danger/90 p-1.5 text-white"
                      onClick={(e) => { e.stopPropagation(); setImages((prev) => prev.filter((x) => x.id !== img.id)); }}
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-2 truncate text-sm font-medium">{img.title}</p>
            </AdminCard>
          </motion.div>
        ))}
      </div>

      <AdminModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? ""} size="lg">
        {preview && (
          <img src={preview.url} alt={preview.title} className="w-full rounded-xl object-cover max-h-[60vh]" />
        )}
      </AdminModal>
    </div>
  );
}
