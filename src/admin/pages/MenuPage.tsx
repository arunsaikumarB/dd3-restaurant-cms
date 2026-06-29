import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import StatusChip from "../components/shared/StatusChip";
import ActionMenu from "../components/shared/ActionMenu";
import AdminBadge from "../components/ui/Badge";
import AdminModal, { ModalFooter } from "../components/ui/Modal";
import AdminDrawer from "../components/ui/Drawer";
import AdminInput from "../components/ui/Input";
import AdminSelect from "../components/ui/Select";
import AdminButton from "../components/ui/Button";
import AdminToggle from "../components/ui/Toggle";
import { MOCK_MENU_ITEMS } from "../data/mock";
import type { MenuItem } from "../types";

export default function MenuManagementPage() {
  const [items] = useState(MOCK_MENU_ITEMS);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  const columns = [
    {
      key: "image",
      label: "Image",
      render: (row: MenuItem) => (
        <img src={row.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ),
    },
    { key: "name", label: "Name", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (row: MenuItem) => `$${row.price.toFixed(2)}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row: MenuItem) => <StatusChip status={row.status} />,
    },
    {
      key: "vegType",
      label: "Type",
      render: (row: MenuItem) => (
        <AdminBadge variant={row.vegType === "veg" ? "success" : "danger"}>
          {row.vegType === "veg" ? "Veg" : "Non-Veg"}
        </AdminBadge>
      ),
    },
    {
      key: "badges",
      label: "Badges",
      render: (row: MenuItem) => (
        <div className="flex gap-1">
          {row.popular && <AdminBadge variant="info">Popular</AdminBadge>}
          {row.chefSpecial && <AdminBadge variant="warning">Chef&apos;s Special</AdminBadge>}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row: MenuItem) => (
        <ActionMenu
          onEdit={() => { setEditItem(row); setEditOpen(true); }}
          onDelete={() => {}}
        />
      ),
    },
  ];

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Menu" }]} />
      <PageHeader
        title="Menu Management"
        description="Manage dishes, pricing, and availability."
        actionLabel="Add Item"
        onAction={() => setAddOpen(true)}
      />

      <DataTable
        data={items as unknown as Record<string, unknown>[]}
        columns={columns as never}
        searchKeys={["name", "category"]}
        filterOptions={{
          key: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "draft", label: "Draft" },
          ],
        }}
        pageSize={6}
        emptyIcon={UtensilsCrossed}
        emptyTitle="No menu items"
        emptyDescription="Add your first dish to get started."
        onCreateClick={() => setAddOpen(true)}
        createLabel="Add Item"
      />

      <AdminModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Menu Item"
        size="lg"
        footer={<ModalFooter onCancel={() => setAddOpen(false)} onConfirm={() => setAddOpen(false)} confirmLabel="Add Item" />}
      >
        <MenuForm />
      </AdminModal>

      <AdminDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Menu Item"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setEditOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={() => setEditOpen(false)}>Save Changes</AdminButton>
          </>
        }
      >
        {editItem && <MenuForm item={editItem} />}
      </AdminDrawer>
    </div>
  );
}

function MenuForm({ item }: { item?: MenuItem }) {
  const [popular, setPopular] = useState(item?.popular ?? false);
  const [chefSpecial, setChefSpecial] = useState(item?.chefSpecial ?? false);

  return (
    <div className="space-y-4">
      <AdminInput label="Item Name" defaultValue={item?.name} placeholder="Chicken Dum Biryani" />
      <AdminSelect
        label="Category"
        value={item?.category ?? ""}
        onChange={() => {}}
        options={[
          { value: "Biryani", label: "Biryani" },
          { value: "North Indian", label: "North Indian" },
          { value: "Kebab & Tandoori", label: "Kebab & Tandoori" },
        ]}
      />
      <AdminInput label="Price" type="number" defaultValue={item?.price?.toString()} placeholder="16.99" />
      <AdminSelect
        label="Status"
        value={item?.status ?? "active"}
        onChange={() => {}}
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "draft", label: "Draft" },
        ]}
      />
      <AdminSelect
        label="Veg / Non-Veg"
        value={item?.vegType ?? "non-veg"}
        onChange={() => {}}
        options={[
          { value: "veg", label: "Vegetarian" },
          { value: "non-veg", label: "Non-Vegetarian" },
        ]}
      />
      <div className="flex gap-6">
        <AdminToggle checked={popular} onChange={setPopular} label="Popular" />
        <AdminToggle checked={chefSpecial} onChange={setChefSpecial} label="Chef's Special" />
      </div>
    </div>
  );
}
