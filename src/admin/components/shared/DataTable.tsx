import { useState, useMemo } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminSelect from "../ui/Select";
import AdminPagination from "../ui/Pagination";
import AdminEmptyState from "../ui/EmptyState";
import { TableSkeleton } from "../ui/Skeleton";
import type { TableColumn } from "../../types";
import type { LucideIcon } from "lucide-react";

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  searchKeys?: (keyof T)[];
  filterOptions?: { key: keyof T; label: string; options: { value: string; label: string }[] };
  pageSize?: number;
  loading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  onCreateClick?: () => void;
  createLabel?: string;
  hideToolbar?: boolean;
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchKeys = [],
  filterOptions,
  pageSize = 5,
  loading = false,
  emptyIcon,
  emptyTitle = "No data found",
  emptyDescription = "Try adjusting your search or filters.",
  onCreateClick,
  createLabel,
  hideToolbar = false,
}: DataTableProps<T>) {
  const { dark } = useAdminTheme();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...data];
    if (search && searchKeys.length) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((k) => String(row[k]).toLowerCase().includes(q)),
      );
    }
    if (filterOptions && filter !== "all") {
      result = result.filter((row) => String(row[filterOptions.key]) === filter);
    }
    if (sortKey) {
      result.sort((a, b) => {
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, filter, sortKey, sortDir, searchKeys, filterOptions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {!hideToolbar && (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-admin-muted"}`} />
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={[
              "h-10 w-full rounded-xl border pl-9 pr-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-admin-orange/30",
              dark ? "border-admin-border-dark bg-white/5 text-white" : "border-admin-border bg-white",
            ].join(" ")}
          />
        </div>
        {filterOptions && (
          <div className="w-44">
            <AdminSelect
              value={filter}
              onChange={(v) => { setFilter(v); setPage(1); }}
              options={[{ value: "all", label: "All" }, ...filterOptions.options]}
            />
          </div>
        )}
      </div>
      )}

      {paginated.length === 0 ? (
        emptyIcon ? (
          <AdminEmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={createLabel}
            onAction={onCreateClick}
          />
        ) : (
          <p className={`py-12 text-center text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
            {emptyDescription}
          </p>
        )
      ) : (
        <div className="overflow-x-auto rounded-2xl border admin-scrollbar">
          <table className={`w-full text-sm ${dark ? "border-admin-border-dark" : "border-admin-border"}`}>
            <thead>
              <tr className={dark ? "border-b border-admin-border-dark bg-white/5" : "border-b border-admin-border bg-admin-ivory/50"}>
                {columns.map((col) => (
                  <th key={String(col.key)} className="px-4 py-3 text-left font-medium">
                    {col.sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-admin-primary"
                        onClick={() => handleSort(String(col.key))}
                      >
                        {col.label}
                        <ArrowUpDown size={12} />
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr
                  key={i}
                  className={[
                    "border-b transition-colors last:border-0",
                    dark ? "border-admin-border-dark hover:bg-white/5" : "border-admin-border/50 hover:bg-admin-ivory/30",
                  ].join(" ")}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3.5">
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <p className={`text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </p>
          <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
