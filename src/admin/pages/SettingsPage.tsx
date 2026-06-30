import { useCallback, useEffect, useRef, useState } from "react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminButton from "../components/ui/Button";
import AdminToast from "../components/ui/Toast";
import ImageUploadField from "../components/settings/ImageUploadField";
import SettingsPageSkeleton from "../components/settings/SettingsPageSkeleton";
import { useLocation } from "../hooks/useLocation";
import {
  getOrCreateRestaurantSettings,
  rowToForm,
  updateRestaurantSettings,
  type RestaurantSettingsForm,
} from "../../services/restaurantSettings";
import { uploadFile } from "../../services/storage/upload";
import {
  hasValidationErrors,
  validateRestaurantSettings,
  type RestaurantSettingsErrors,
} from "../../utils/validation/restaurantSettings";

export default function SettingsPage() {
  const { locationId, isAllLocations, scope } = useLocation();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState<RestaurantSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RestaurantSettingsErrors>({});
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const savedFormRef = useRef<RestaurantSettingsForm | null>(null);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

  const loadSettings = useCallback(async () => {
    if (isAllLocations) {
      setLoading(false);
      setLoadError(null);
      setForm(null);
      setSettingsId(null);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const row = await getOrCreateRestaurantSettings(locationId);
      const nextForm = rowToForm(row);
      setSettingsId(row.id);
      setForm(nextForm);
      savedFormRef.current = nextForm;
      setFieldErrors({});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [isAllLocations, locationId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings, scope]);

  const uploadAsset = async (file: File, folder: "logo" | "favicon") => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { publicUrl } = await uploadFile({
      bucket: "restaurant-assets",
      file,
      path,
      upsert: true,
    });
    return publicUrl;
  };

  const patchForm = (patch: Partial<RestaurantSettingsForm>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const patchHours = (key: keyof RestaurantSettingsForm["opening_hours"], value: string) => {
    setForm((prev) =>
      prev ? { ...prev, opening_hours: { ...prev.opening_hours, [key]: value } } : prev,
    );
  };

  const handleSave = async () => {
    if (!form || !settingsId || saving) return;

    const errors = validateRestaurantSettings(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateRestaurantSettings(locationId, form);
      const nextForm = rowToForm(updated);
      setForm(nextForm);
      savedFormRef.current = nextForm;
      setFieldErrors({});
      showToast("Settings saved successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (savedFormRef.current) {
      setForm({ ...savedFormRef.current });
    }
    setFieldErrors({});
  };

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Settings" }]} />
        <PageHeader
          title="Restaurant Settings"
          description="Configure your restaurant details, hours, and SEO."
        />
        <SettingsPageSkeleton />
      </div>
    );
  }

  if (isAllLocations) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Settings" }]} />
        <PageHeader
          title="Restaurant Settings"
          description="Configure your restaurant details, hours, and SEO."
        />
        <AdminCard>
          <p className="text-sm text-admin-muted">
            Select a single location in the header to edit restaurant settings for that branch.
          </p>
        </AdminCard>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Settings" }]} />
        <PageHeader
          title="Restaurant Settings"
          description="Configure your restaurant details, hours, and SEO."
        />
        <AdminCard>
          <p className="text-sm text-admin-danger">{loadError ?? "Unable to load settings."}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadSettings()}>
              Retry
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    );
  }

  const sections = [
    {
      title: "Restaurant Info",
      fields: (
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput
            label="Restaurant Name"
            value={form.restaurant_name}
            error={fieldErrors.restaurant_name}
            onChange={(e) => patchForm({ restaurant_name: e.target.value })}
          />
          <AdminInput
            label="Phone"
            value={form.phone}
            error={fieldErrors.phone}
            onChange={(e) => patchForm({ phone: e.target.value })}
          />
          <AdminInput
            label="Email"
            type="email"
            value={form.email}
            error={fieldErrors.email}
            onChange={(e) => patchForm({ email: e.target.value })}
          />
          <AdminInput
            label="Address"
            value={form.address}
            className="sm:col-span-2"
            onChange={(e) => patchForm({ address: e.target.value })}
          />
        </div>
      ),
    },
    {
      title: "Brand Assets",
      fields: (
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageUploadField
            label="Restaurant Logo"
            value={form.logo}
            disabled={saving}
            onChange={(url) => patchForm({ logo: url || null })}
            onUpload={(file) => uploadAsset(file, "logo")}
          />
          <ImageUploadField
            label="Favicon"
            value={form.favicon}
            disabled={saving}
            onChange={(url) => patchForm({ favicon: url || null })}
            onUpload={(file) => uploadAsset(file, "favicon")}
          />
        </div>
      ),
    },
    {
      title: "Opening Hours",
      fields: (
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminInput
            label="Mon – Thu / Fri – Sat"
            value={form.opening_hours.weekday}
            onChange={(e) => patchHours("weekday", e.target.value)}
          />
          <AdminInput
            label="Weekend"
            value={form.opening_hours.weekend}
            onChange={(e) => patchHours("weekend", e.target.value)}
          />
          <AdminInput
            label="Sunday"
            value={form.opening_hours.sunday}
            onChange={(e) => patchHours("sunday", e.target.value)}
          />
        </div>
      ),
    },
    {
      title: "Order & Reservation Links",
      fields: (
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput
            label="Reservation URL"
            value={form.reservation_url}
            error={fieldErrors.reservation_url}
            onChange={(e) => patchForm({ reservation_url: e.target.value })}
            placeholder="/reservation or https://..."
          />
          <AdminInput
            label="Order URL"
            value={form.order_url}
            error={fieldErrors.order_url}
            onChange={(e) => patchForm({ order_url: e.target.value })}
            placeholder="https://orders.chefgaa.com/..."
          />
        </div>
      ),
    },
    {
      title: "Social Media",
      fields: (
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput
            label="Instagram"
            value={form.instagram}
            error={fieldErrors.instagram}
            onChange={(e) => patchForm({ instagram: e.target.value })}
          />
          <AdminInput
            label="Facebook"
            value={form.facebook}
            error={fieldErrors.facebook}
            onChange={(e) => patchForm({ facebook: e.target.value })}
          />
          <AdminInput
            label="Google Maps"
            value={form.google_maps}
            error={fieldErrors.google_maps}
            onChange={(e) => patchForm({ google_maps: e.target.value })}
            className="sm:col-span-2"
          />
        </div>
      ),
    },
    {
      title: "Google Maps Embed",
      fields: (
        <AdminInput
          label="Maps URL"
          value={form.google_maps}
          error={fieldErrors.google_maps}
          onChange={(e) => patchForm({ google_maps: e.target.value })}
        />
      ),
    },
    {
      title: "SEO Settings",
      fields: (
        <div className="space-y-4">
          <AdminInput
            label="Page Title"
            value={form.seo_title}
            onChange={(e) => patchForm({ seo_title: e.target.value })}
          />
          <AdminTextarea
            label="Meta Description"
            value={form.seo_description}
            onChange={(e) => patchForm({ seo_description: e.target.value })}
          />
          <AdminInput
            label="Keywords"
            value={form.seo_keywords}
            onChange={(e) => patchForm({ seo_keywords: e.target.value })}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Settings" }]} />
      <PageHeader
        title="Restaurant Settings"
        description="Configure your restaurant details, hours, and SEO."
      />

      <div className="space-y-6">
        {sections.map((section) => (
          <AdminCard key={section.title}>
            <h2 className="mb-4 text-base font-semibold">{section.title}</h2>
            {section.fields}
          </AdminCard>
        ))}
        <div className="flex justify-end gap-2">
          <AdminButton type="button" variant="outline" disabled={saving} onClick={handleReset}>
            Reset
          </AdminButton>
          <AdminButton type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Save Settings"}
          </AdminButton>
        </div>
      </div>

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
