import { useState } from "react";
import { motion } from "framer-motion";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import StatusChip from "../components/shared/StatusChip";
import AdminCard from "../components/ui/Card";
import AdminToggle from "../components/ui/Toggle";
import ActionMenu from "../components/shared/ActionMenu";
import { useAdminTheme } from "../context/AdminThemeContext";
import { MOCK_OFFERS } from "../data/mock";

export default function OffersPage() {
  const { dark } = useAdminTheme();
  const [offers, setOffers] = useState(MOCK_OFFERS);

  const toggleStatus = (id: string) => {
    setOffers((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: o.status === "active" ? "inactive" : "active" }
          : o,
      ),
    );
  };

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Offers" }]} />
      <PageHeader
        title="Offers & Promotions"
        description="Create and manage special deals and discounts."
        actionLabel="Create Offer"
        onAction={() => {}}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {offers.map((offer, i) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <AdminCard className="overflow-hidden p-0">
              <div className="relative h-40">
                <img src={offer.banner} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <span className="rounded-full bg-admin-gold px-3 py-1 text-sm font-bold text-white">
                    {offer.discount}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold text-white">{offer.name}</h3>
                </div>
                <div className="absolute right-3 top-3">
                  <ActionMenu onEdit={() => {}} onDelete={() => {}} />
                </div>
              </div>
              <div className="flex items-center justify-between p-5">
                <div>
                  <p className={`text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
                    {offer.startDate} — {offer.endDate}
                  </p>
                  <div className="mt-2">
                    <StatusChip status={offer.status} />
                  </div>
                </div>
                <AdminToggle
                  checked={offer.status === "active"}
                  onChange={() => toggleStatus(offer.id)}
                  label={offer.status === "active" ? "Active" : "Inactive"}
                />
              </div>
            </AdminCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
