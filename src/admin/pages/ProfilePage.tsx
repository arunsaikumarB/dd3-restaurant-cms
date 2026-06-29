import { useState } from "react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminInput from "../components/ui/Input";
import AdminButton from "../components/ui/Button";
import AdminBadge from "../components/ui/Badge";
import { useAdminTheme } from "../context/AdminThemeContext";
import { ADMIN_PROFILE } from "../data/mock";

export default function ProfilePage() {
  const { dark } = useAdminTheme();
  const [profile, setProfile] = useState(ADMIN_PROFILE);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Profile" }]} />
      <PageHeader title="Profile" description="Manage your admin account settings." />

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminCard className="flex flex-col items-center text-center lg:col-span-1">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-admin-primary to-admin-gold text-2xl font-bold text-white">
            {profile.name.charAt(0)}
          </div>
          <h2 className="mt-4 text-lg font-semibold">{profile.name}</h2>
          <AdminBadge variant="info" className="mt-2">{profile.role}</AdminBadge>
          <p className={`mt-2 text-sm ${dark ? "text-white/40" : "text-admin-muted"}`}>
            Member since {profile.joined}
          </p>
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold">Account Details</h3>
          <div className="space-y-4">
            <AdminInput
              label="Full Name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <AdminInput
              label="Email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
            <AdminInput label="Role" value={profile.role} disabled />
          </div>
          <div className="mt-6 border-t border-inherit pt-6">
            <h3 className="mb-4 text-base font-semibold">Change Password</h3>
            <div className="space-y-4">
              <AdminInput label="Current Password" type="password" placeholder="••••••••" />
              <AdminInput label="New Password" type="password" placeholder="••••••••" />
              <AdminInput label="Confirm Password" type="password" placeholder="••••••••" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <AdminButton>Update Profile</AdminButton>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
