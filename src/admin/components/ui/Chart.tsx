import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminCard from "./Card";

interface ChartPoint {
  label: string;
  value: number;
}

interface AdminChartProps {
  title: string;
  data: ChartPoint[];
  type?: "bar" | "area";
  height?: number;
}

export default function AdminChart({
  title,
  data,
  type = "bar",
  height = 180,
}: AdminChartProps) {
  const { dark } = useAdminTheme();
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <AdminCard>
      <h3 className="mb-6 text-sm font-semibold">{title}</h3>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((point) => {
          const pct = (point.value / max) * 100;
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative w-full flex-1 flex items-end">
                {type === "bar" ? (
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-admin-primary to-admin-gold transition-all duration-500"
                    style={{ height: `${pct}%`, minHeight: 4 }}
                  />
                ) : (
                  <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`grad-${point.label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ED3C18" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ED3C18" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
              </div>
              <span className={`text-[10px] font-medium ${dark ? "text-white/40" : "text-admin-muted"}`}>
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}

export function AreaChart({ title, data }: { title: string; data: ChartPoint[] }) {
  const { dark } = useAdminTheme();
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 100;
  const h = 60;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.value / max) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <AdminCard>
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 160 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ED3C18" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ED3C18" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#areaGrad)" />
        <polyline
          points={points}
          fill="none"
          stroke="#ED3C18"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-2 flex justify-between">
        {data.map((d) => (
          <span key={d.label} className={`text-[10px] ${dark ? "text-white/40" : "text-admin-muted"}`}>
            {d.label}
          </span>
        ))}
      </div>
    </AdminCard>
  );
}
