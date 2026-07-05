import type { ReactNode } from "react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminCard from "../ui/Card";
import type { SeoMetadataForm } from "../../../types/seoMetadata";

type Props = {
  form: SeoMetadataForm;
  canonicalUrl: string;
};

function PreviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AdminCard>
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </AdminCard>
  );
}

export default function SeoPreviewPanel({ form, canonicalUrl }: Props) {
  const { dark } = useAdminTheme();
  const title = form.openGraph.ogTitle.trim() || form.basic.seoTitle.trim();
  const description = form.openGraph.ogDescription.trim() || form.basic.metaDescription.trim();
  const image = form.openGraph.ogImage.trim() || form.twitter.twitterImage.trim();
  const twitterTitle = form.twitter.twitterTitle.trim() || title;
  const twitterDescription = form.twitter.twitterDescription.trim() || description;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PreviewCard title="Google Search Preview">
        <div className="space-y-1">
          <p className="text-sm text-[#202124]">{title || "SEO title preview"}</p>
          <p className="text-xs text-[#006621]">{canonicalUrl || "https://example.com/page"}</p>
          <p className="text-sm text-[#4d5156]">{description || "Meta description preview"}</p>
        </div>
      </PreviewCard>

      <PreviewCard title="Facebook / LinkedIn Preview">
        <div
          className={[
            "overflow-hidden rounded-xl border",
            dark ? "border-admin-border-dark bg-white/5" : "border-admin-border bg-white",
          ].join(" ")}
        >
          {image ? (
            <img src={image} alt="" className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-36 items-center justify-center bg-admin-ivory text-xs text-admin-muted">
              OG image preview
            </div>
          )}
          <div className="space-y-1 p-4">
            <p className="text-[11px] uppercase tracking-wide text-admin-muted">
              {canonicalUrl.replace(/^https?:\/\//, "")}
            </p>
            <p className="text-sm font-semibold">{title || "OG title"}</p>
            <p className="text-sm text-admin-muted">{description || "OG description"}</p>
          </div>
        </div>
      </PreviewCard>

      <PreviewCard title="Twitter Preview">
        <div
          className={[
            "overflow-hidden rounded-xl border",
            dark ? "border-admin-border-dark bg-white/5" : "border-admin-border bg-white",
          ].join(" ")}
        >
          {image ? (
            <img src={image} alt="" className="h-40 w-full object-cover" />
          ) : (
            <div className="flex h-40 items-center justify-center bg-admin-ivory text-xs text-admin-muted">
              Twitter image preview
            </div>
          )}
          <div className="space-y-1 p-4">
            <p className="text-sm font-semibold">{twitterTitle || "Twitter title"}</p>
            <p className="text-sm text-admin-muted">{twitterDescription || "Twitter description"}</p>
            <p className="text-xs text-admin-muted">{form.twitter.twitterCardType}</p>
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}
