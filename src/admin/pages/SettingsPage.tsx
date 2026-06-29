import { useState } from "react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminButton from "../components/ui/Button";
import { RESTAURANT_SETTINGS } from "../data/mock";

export default function SettingsPage() {
  const [settings, setSettings] = useState(RESTAURANT_SETTINGS);

  const sections = [
    {
      title: "Restaurant Info",
      fields: (
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput label="Restaurant Name" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          <AdminInput label="Phone" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          <AdminInput label="Email" type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
          <AdminInput label="Address" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="sm:col-span-2" />
        </div>
      ),
    },
    {
      title: "Opening Hours",
      fields: (
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminInput label="Mon – Thu / Fri – Sat" value={settings.hours.weekday} onChange={() => {}} />
          <AdminInput label="Weekend" value={settings.hours.weekend} onChange={() => {}} />
          <AdminInput label="Sunday" value={settings.hours.sunday} onChange={() => {}} />
        </div>
      ),
    },
    {
      title: "Social Media",
      fields: (
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput label="Instagram" value={settings.social.instagram} onChange={() => {}} />
          <AdminInput label="Facebook" value={settings.social.facebook} onChange={() => {}} />
          <AdminInput label="Google Maps" value={settings.social.google} onChange={() => {}} className="sm:col-span-2" />
        </div>
      ),
    },
    {
      title: "Google Maps Embed",
      fields: <AdminInput label="Maps URL" value={settings.maps} onChange={() => {}} />,
    },
    {
      title: "SEO Settings",
      fields: (
        <div className="space-y-4">
          <AdminInput label="Page Title" value={settings.seo.title} onChange={() => {}} />
          <AdminTextarea label="Meta Description" value={settings.seo.description} onChange={() => {}} />
          <AdminInput label="Keywords" value={settings.seo.keywords} onChange={() => {}} />
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
          <AdminButton variant="outline">Reset</AdminButton>
          <AdminButton>Save Settings</AdminButton>
        </div>
      </div>
    </div>
  );
}
