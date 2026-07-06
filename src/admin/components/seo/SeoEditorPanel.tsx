import { Plus, Trash2 } from "lucide-react";
import type { LocationId } from "../../../config/locations";
import { getSiteUrl } from "../../../config/env";
import { getSeoPagePath } from "../../../config/seoPages";
import type { SeoEditorSectionKey } from "../../config/seoPages";
import type { SeoMetadataForm, SeoPageKey, SeoSchemaType } from "../../../types/seoMetadata";
import { generateSeoJsonLd, resolveEffectiveJsonLd } from "../../../utils/seo/schemaGenerator";
import ImageUploadField from "../settings/ImageUploadField";
import AdminButton from "../ui/Button";
import AdminCard from "../ui/Card";
import AdminInput from "../ui/Input";
import AdminSelect from "../ui/Select";
import AdminTextarea from "../ui/Textarea";
import AdminToggle from "../ui/Toggle";
import SeoPreviewPanel from "./SeoPreviewPanel";
import { uploadFile } from "../../../services/storage/upload";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AdminCard>
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </AdminCard>
  );
}

const SCHEMA_TYPE_OPTIONS: SeoSchemaType[] = [
  "Restaurant",
  "LocalBusiness",
  "Organization",
  "FAQPage",
  "Menu",
  "Offer",
  "Review",
  "BreadcrumbList",
  "WebSite",
  "Article",
];

type Props = {
  form: SeoMetadataForm;
  pageKey: SeoPageKey;
  locationId: LocationId;
  activeSection: SeoEditorSectionKey;
  saving: boolean;
  onChange: (form: SeoMetadataForm) => void;
};

export default function SeoEditorPanel({
  form,
  pageKey,
  locationId,
  activeSection,
  saving,
  onChange,
}: Props) {
  const patch = (partial: Partial<SeoMetadataForm>) => onChange({ ...form, ...partial });
  const patchBasic = (partial: Partial<SeoMetadataForm["basic"]>) =>
    patch({ basic: { ...form.basic, ...partial } });
  const patchOg = (partial: Partial<SeoMetadataForm["openGraph"]>) =>
    patch({ openGraph: { ...form.openGraph, ...partial } });
  const patchTwitter = (partial: Partial<SeoMetadataForm["twitter"]>) =>
    patch({ twitter: { ...form.twitter, ...partial } });
  const patchHeadings = (partial: Partial<SeoMetadataForm["headings"]>) =>
    patch({ headings: { ...form.headings, ...partial } });
  const patchSchema = (partial: Partial<SeoMetadataForm["schema"]>) =>
    patch({ schema: { ...form.schema, ...partial } });
  const patchContent = (partial: Partial<SeoMetadataForm["content"]>) =>
    patch({ content: { ...form.content, ...partial } });
  const patchImageSeo = (partial: Partial<SeoMetadataForm["imageSeo"]>) =>
    patch({ imageSeo: { ...form.imageSeo, ...partial } });
  const patchLocal = (partial: Partial<SeoMetadataForm["localSeo"]>) =>
    patch({ localSeo: { ...form.localSeo, ...partial } });
  const patchAdvanced = (partial: Partial<SeoMetadataForm["advanced"]>) =>
    patch({ advanced: { ...form.advanced, ...partial } });

  const canonicalUrl =
    form.basic.canonicalUrl.trim() ||
    form.advanced.canonicalUrl.trim() ||
    `${getSiteUrl()}/${locationId}${getSeoPagePath(pageKey)}`.replace(/\/+$/, "");

  const uploadOgImage = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const { publicUrl } = await uploadFile({
      bucket: "restaurant-assets",
      file,
      path: `seo/${locationId}/${pageKey}-${crypto.randomUUID()}.${ext}`,
      upsert: true,
    });
    return publicUrl;
  };

  const toggleSchemaType = (type: SeoSchemaType) => {
    const next = form.schema.schemaTypes.includes(type)
      ? form.schema.schemaTypes.filter((value) => value !== type)
      : [...form.schema.schemaTypes, type];
    patchSchema({ schemaTypes: next });
  };

  const updateHeadingList = (key: "h2" | "h3", index: number, value: string) => {
    const list = [...form.headings[key]];
    list[index] = value;
    patchHeadings({ [key]: list });
  };

  const addHeadingRow = (key: "h2" | "h3") => {
    patchHeadings({ [key]: [...form.headings[key], ""] });
  };

  const removeHeadingRow = (key: "h2" | "h3", index: number) => {
    patchHeadings({ [key]: form.headings[key].filter((_, i) => i !== index) });
  };

  const addFaq = () => {
    patch({
      faqs: [
        ...form.faqs,
        {
          id: crypto.randomUUID(),
          question: "",
          answer: "",
          displayOrder: form.faqs.length,
          status: "active",
        },
      ],
    });
  };

  const updateFaq = (id: string, partial: Partial<(typeof form.faqs)[number]>) => {
    patch({
      faqs: form.faqs.map((faq) => (faq.id === id ? { ...faq, ...partial } : faq)),
    });
  };

  const removeFaq = (id: string) => {
    patch({ faqs: form.faqs.filter((faq) => faq.id !== id) });
  };

  const effectiveJsonLd = resolveEffectiveJsonLd(form, locationId, pageKey);

  if (activeSection === "preview") {
    return <SeoPreviewPanel form={form} canonicalUrl={canonicalUrl} />;
  }

  if (activeSection === "basic") {
    return (
      <SectionCard title="Basic SEO">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AdminInput
              label="SEO Title"
              value={form.basic.seoTitle}
              onChange={(e) => patchBasic({ seoTitle: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <AdminTextarea
              label="Meta Description"
              value={form.basic.metaDescription}
              onChange={(e) => patchBasic({ metaDescription: e.target.value })}
              rows={4}
            />
          </div>
          <AdminInput
            label="Focus Keyword"
            value={form.basic.focusKeyword}
            onChange={(e) => patchBasic({ focusKeyword: e.target.value })}
          />
          <AdminInput
            label="Secondary Keywords"
            value={form.basic.secondaryKeywords}
            onChange={(e) => patchBasic({ secondaryKeywords: e.target.value })}
          />
          <div className="sm:col-span-2">
            <AdminInput
              label="Canonical URL"
              value={form.basic.canonicalUrl}
              onChange={(e) => patchBasic({ canonicalUrl: e.target.value })}
            />
          </div>
          <AdminInput
            label="SEO Slug"
            value={form.basic.seoSlug}
            onChange={(e) => patchBasic({ seoSlug: e.target.value })}
          />
        </div>
      </SectionCard>
    );
  }

  if (activeSection === "openGraph") {
    return (
      <SectionCard title="Open Graph">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AdminInput label="OG Title" value={form.openGraph.ogTitle} onChange={(e) => patchOg({ ogTitle: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <AdminTextarea label="OG Description" value={form.openGraph.ogDescription} onChange={(e) => patchOg({ ogDescription: e.target.value })} rows={3} />
          </div>
          <ImageUploadField label="OG Image" value={form.openGraph.ogImage || null} disabled={saving} onChange={(url) => patchOg({ ogImage: url })} onUpload={uploadOgImage} />
          <AdminInput label="OG Locale" value={form.openGraph.ogLocale} onChange={(e) => patchOg({ ogLocale: e.target.value })} />
          <div className="sm:col-span-2">
            <AdminInput label="OG URL" value={form.openGraph.ogUrl} onChange={(e) => patchOg({ ogUrl: e.target.value })} />
          </div>
          <AdminInput label="OG Type" value={form.openGraph.ogType} onChange={(e) => patchOg({ ogType: e.target.value })} />
        </div>
      </SectionCard>
    );
  }

  if (activeSection === "twitter") {
    return (
      <SectionCard title="Twitter SEO">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AdminInput label="Twitter Title" value={form.twitter.twitterTitle} onChange={(e) => patchTwitter({ twitterTitle: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <AdminTextarea label="Twitter Description" value={form.twitter.twitterDescription} onChange={(e) => patchTwitter({ twitterDescription: e.target.value })} rows={3} />
          </div>
          <ImageUploadField label="Twitter Image" value={form.twitter.twitterImage || null} disabled={saving} onChange={(url) => patchTwitter({ twitterImage: url })} onUpload={uploadOgImage} />
          <AdminSelect
            label="Twitter Card Type"
            value={form.twitter.twitterCardType}
            onChange={(value) => patchTwitter({ twitterCardType: value as SeoMetadataForm["twitter"]["twitterCardType"] })}
            options={[
              { value: "summary", label: "Summary" },
              { value: "summary_large_image", label: "Summary Large Image" },
              { value: "app", label: "App" },
              { value: "player", label: "Player" },
            ]}
          />
        </div>
      </SectionCard>
    );
  }

  if (activeSection === "headings") {
    return (
      <SectionCard title="Headings">
        <div className="space-y-6">
          <AdminInput label="H1" value={form.headings.h1} onChange={(e) => patchHeadings({ h1: e.target.value })} />
          {(["h2", "h3"] as const).map((key) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide">{key.toUpperCase()} Headings</h4>
                <AdminButton type="button" variant="outline" onClick={() => addHeadingRow(key)}>
                  <Plus size={14} /> Add {key.toUpperCase()}
                </AdminButton>
              </div>
              {form.headings[key].map((value, index) => (
                <div key={`${key}-${index}`} className="flex gap-2">
                  <AdminInput label={`${key.toUpperCase()} ${index + 1}`} value={value} onChange={(e) => updateHeadingList(key, index, e.target.value)} />
                  <AdminButton type="button" variant="outline" className="mt-7" onClick={() => removeHeadingRow(key, index)}>
                    <Trash2 size={14} />
                  </AdminButton>
                </div>
              ))}
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (activeSection === "schema") {
    return (
      <SectionCard title="Schema Markup">
        <div className="space-y-4">
          <AdminToggle checked={form.schema.autoGenerate} onChange={(checked) => patchSchema({ autoGenerate: checked })} label="Auto-generate JSON-LD" />
          <div className="flex flex-wrap gap-2">
            {SCHEMA_TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleSchemaType(type)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  form.schema.schemaTypes.includes(type) ? "bg-admin-primary text-white" : "bg-admin-ivory text-admin-muted",
                ].join(" ")}
              >
                {type}
              </button>
            ))}
          </div>
          <AdminButton
            type="button"
            variant="outline"
            onClick={() => patchSchema({ jsonLd: generateSeoJsonLd(form, locationId, pageKey), autoGenerate: false })}
          >
            Generate JSON-LD
          </AdminButton>
          <AdminTextarea
            label="JSON-LD"
            value={form.schema.autoGenerate ? effectiveJsonLd : form.schema.jsonLd}
            onChange={(e) => patchSchema({ jsonLd: e.target.value, autoGenerate: false })}
            rows={16}
            className="font-mono text-xs"
          />
        </div>
      </SectionCard>
    );
  }

  if (activeSection === "content") {
    return (
      <SectionCard title="Content SEO">
        <div className="space-y-4">
          <AdminTextarea label="SEO Introduction" value={form.content.seoIntroduction} onChange={(e) => patchContent({ seoIntroduction: e.target.value })} rows={5} />
          <AdminTextarea label="SEO Conclusion" value={form.content.seoConclusion} onChange={(e) => patchContent({ seoConclusion: e.target.value })} rows={5} />
          <AdminTextarea label="SEO Footer Content" value={form.content.seoFooterContent} onChange={(e) => patchContent({ seoFooterContent: e.target.value })} rows={5} />
        </div>
      </SectionCard>
    );
  }

  if (activeSection === "faq") {
    return (
      <SectionCard title="FAQ Builder">
        <div className="space-y-4">
          <AdminButton type="button" onClick={addFaq}>
            <Plus size={14} /> Add FAQ
          </AdminButton>
          {form.faqs.map((faq, index) => (
            <div key={faq.id} className="rounded-xl border border-admin-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">FAQ {index + 1}</p>
                <AdminButton type="button" variant="outline" onClick={() => removeFaq(faq.id)}>
                  <Trash2 size={14} />
                </AdminButton>
              </div>
              <AdminInput label="Question" value={faq.question} onChange={(e) => updateFaq(faq.id, { question: e.target.value })} />
              <AdminTextarea label="Answer" value={faq.answer} onChange={(e) => updateFaq(faq.id, { answer: e.target.value })} rows={4} />
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminInput label="Display Order" type="number" value={String(faq.displayOrder)} onChange={(e) => updateFaq(faq.id, { displayOrder: Number(e.target.value) || 0 })} />
                <AdminSelect
                  label="Status"
                  value={faq.status}
                  onChange={(value) => updateFaq(faq.id, { status: value as "active" | "inactive" })}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (activeSection === "imageSeo") {
    return (
      <SectionCard title="Image SEO">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AdminInput label="Default ALT Text" value={form.imageSeo.defaultAltText} onChange={(e) => patchImageSeo({ defaultAltText: e.target.value })} />
          </div>
          <AdminInput label="Image Title" value={form.imageSeo.imageTitle} onChange={(e) => patchImageSeo({ imageTitle: e.target.value })} />
          <AdminInput label="Image Caption" value={form.imageSeo.imageCaption} onChange={(e) => patchImageSeo({ imageCaption: e.target.value })} />
          <div className="sm:col-span-2">
            <AdminTextarea label="Image Description" value={form.imageSeo.imageDescription} onChange={(e) => patchImageSeo({ imageDescription: e.target.value })} rows={4} />
          </div>
        </div>
      </SectionCard>
    );
  }

  if (activeSection === "localSeo") {
    return (
      <SectionCard title="Local SEO">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput label="Business Name" value={form.localSeo.businessName} onChange={(e) => patchLocal({ businessName: e.target.value })} />
          <AdminInput label="Restaurant Name" value={form.localSeo.restaurantName} onChange={(e) => patchLocal({ restaurantName: e.target.value })} />
          <AdminInput label="Cuisine Type" value={form.localSeo.cuisineType} onChange={(e) => patchLocal({ cuisineType: e.target.value })} />
          <div className="sm:col-span-2">
            <AdminInput label="Address" value={form.localSeo.address} onChange={(e) => patchLocal({ address: e.target.value })} />
          </div>
          <AdminInput label="City" value={form.localSeo.city} onChange={(e) => patchLocal({ city: e.target.value })} />
          <AdminInput label="State" value={form.localSeo.state} onChange={(e) => patchLocal({ state: e.target.value })} />
          <AdminInput label="Zip Code" value={form.localSeo.zipCode} onChange={(e) => patchLocal({ zipCode: e.target.value })} />
          <AdminInput label="Country" value={form.localSeo.country} onChange={(e) => patchLocal({ country: e.target.value })} />
          <AdminInput label="Latitude" value={form.localSeo.latitude} onChange={(e) => patchLocal({ latitude: e.target.value })} />
          <AdminInput label="Longitude" value={form.localSeo.longitude} onChange={(e) => patchLocal({ longitude: e.target.value })} />
          <AdminInput label="Phone" value={form.localSeo.phone} onChange={(e) => patchLocal({ phone: e.target.value })} />
          <AdminInput label="Email" value={form.localSeo.email} onChange={(e) => patchLocal({ email: e.target.value })} />
          <div className="sm:col-span-2">
            <AdminInput label="Google Maps URL" value={form.localSeo.googleMapsUrl} onChange={(e) => patchLocal({ googleMapsUrl: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <AdminInput label="Google Business Profile URL" value={form.localSeo.googleBusinessProfileUrl} onChange={(e) => patchLocal({ googleBusinessProfileUrl: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <AdminTextarea label="Opening Hours" value={form.localSeo.openingHours} onChange={(e) => patchLocal({ openingHours: e.target.value })} rows={3} />
          </div>
          <AdminToggle checked={form.localSeo.deliveryAvailable} onChange={(checked) => patchLocal({ deliveryAvailable: checked })} label="Delivery Available" />
          <AdminToggle checked={form.localSeo.takeawayAvailable} onChange={(checked) => patchLocal({ takeawayAvailable: checked })} label="Takeaway Available" />
          <AdminToggle checked={form.localSeo.reservationAvailable} onChange={(checked) => patchLocal({ reservationAvailable: checked })} label="Reservation Available" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Advanced SEO">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput label="Priority" value={form.advanced.priority} onChange={(e) => patchAdvanced({ priority: e.target.value })} />
        <AdminSelect
          label="Change Frequency"
          value={form.advanced.changeFrequency}
          onChange={(value) => patchAdvanced({ changeFrequency: value as SeoMetadataForm["advanced"]["changeFrequency"] })}
          options={[
            { value: "always", label: "Always" },
            { value: "hourly", label: "Hourly" },
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
            { value: "never", label: "Never" },
          ]}
        />
        <div className="sm:col-span-2">
          <AdminInput label="Canonical URL" value={form.advanced.canonicalUrl} onChange={(e) => patchAdvanced({ canonicalUrl: e.target.value })} />
        </div>
        <AdminInput label="Last Modified" type="date" value={form.advanced.lastModified} onChange={(e) => patchAdvanced({ lastModified: e.target.value })} />
        <AdminToggle checked={form.advanced.includeInSitemap} onChange={(checked) => patchAdvanced({ includeInSitemap: checked })} label="Include in Sitemap" />
        <AdminToggle checked={form.advanced.excludeFromSitemap} onChange={(checked) => patchAdvanced({ excludeFromSitemap: checked })} label="Exclude from Sitemap" />
        <AdminToggle checked={form.advanced.noIndex} onChange={(checked) => patchAdvanced({ noIndex: checked })} label="NoIndex" />
        <AdminToggle checked={form.advanced.noFollow} onChange={(checked) => patchAdvanced({ noFollow: checked })} label="NoFollow" />
        <AdminToggle checked={form.advanced.noArchive} onChange={(checked) => patchAdvanced({ noArchive: checked })} label="NoArchive" />
        <AdminToggle checked={form.advanced.noSnippet} onChange={(checked) => patchAdvanced({ noSnippet: checked })} label="NoSnippet" />
      </div>
    </SectionCard>
  );
}
