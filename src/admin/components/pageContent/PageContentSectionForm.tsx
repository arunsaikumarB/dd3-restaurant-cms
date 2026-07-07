import AdminInput from "../ui/Input";
import AdminTextarea from "../ui/Textarea";
import AdminButton from "../ui/Button";
import ImageUploadField from "../settings/ImageUploadField";
import { useAdminTheme } from "../../context/AdminThemeContext";
import type {
  PageContentCtaValue,
  PageContentField,
  PageContentImageField,
  PageContentListField,
  PageContentSectionDefinition,
  PageContentTextField,
} from "../../../config/pageContentSchema";
import {
  addListItem,
  getListFieldItems,
  getTemplatePlaceholderHint,
  removeListItem,
  reorderListItem,
  updateCtaField,
  updateListItemField,
  updateScalarField,
} from "../../../utils/pageContentFormUtils";
import { uploadFile } from "../../../services/storage/upload";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

async function uploadListItemImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const { publicUrl } = await uploadFile({
    bucket: "restaurant-assets",
    file,
    path: `page-content/${crypto.randomUUID()}.${ext}`,
    upsert: true,
  });
  return publicUrl;
}

type PageContentSectionFormProps = {
  definition: PageContentSectionDefinition;
  content: Record<string, unknown>;
  disabled?: boolean;
  onChange: (next: Record<string, unknown>) => void;
};

function getCtaValue(content: Record<string, unknown>, key: string): PageContentCtaValue {
  const value = content[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return {
      label: typeof record.label === "string" ? record.label : "",
      url: typeof record.url === "string" ? record.url : "",
    };
  }
  return { label: "", url: "" };
}

function renderScalarField(
  field: PageContentTextField,
  value: string,
  disabled: boolean,
  onChange: (value: string) => void,
) {
  const hint = getTemplatePlaceholderHint(field.label, field.helpText);
  const label = field.required ? `${field.label} *` : field.label;

  if (field.type === "textarea") {
    return (
      <div key={field.key}>
        <AdminTextarea
          label={label}
          value={value}
          disabled={disabled}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
        {hint ? <p className="mt-1 text-xs text-admin-muted">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div key={field.key}>
      <AdminInput
        label={label}
        value={value}
        disabled={disabled}
        maxLength={field.maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p className="mt-1 text-xs text-admin-muted">{hint}</p> : null}
    </div>
  );
}

function renderImageListField(
  field: PageContentImageField,
  value: string,
  disabled: boolean,
  onChange: (value: string) => void,
) {
  return (
    <div key={field.key}>
      <ImageUploadField
        label={field.label}
        value={value || null}
        disabled={disabled}
        onChange={onChange}
        onUpload={uploadListItemImage}
      />
    </div>
  );
}

function renderCtaField(
  field: Extract<PageContentField, { type: "cta" }>,
  value: PageContentCtaValue,
  disabled: boolean,
  onChange: (part: keyof PageContentCtaValue, next: string) => void,
) {
  const hint = getTemplatePlaceholderHint(field.label, field.helpText);

  return (
    <div key={field.key} className="rounded-xl border border-admin-border/60 p-4 dark:border-white/10">
      <p className="mb-3 text-sm font-medium text-admin-text dark:text-white/80">{field.label}</p>
      <div className="space-y-3">
        <AdminInput
          label="Label"
          value={value.label}
          disabled={disabled}
          onChange={(event) => onChange("label", event.target.value)}
        />
        <AdminInput
          label="URL"
          value={value.url}
          disabled={disabled}
          onChange={(event) => onChange("url", event.target.value)}
        />
      </div>
      {hint ? <p className="mt-2 text-xs text-admin-muted">{hint}</p> : null}
    </div>
  );
}

function renderListField(
  field: PageContentListField,
  content: Record<string, unknown>,
  disabled: boolean,
  dark: boolean,
  onChange: (next: Record<string, unknown>) => void,
) {
  const items = getListFieldItems(content, field);
  const hint = getTemplatePlaceholderHint(field.label, field.helpText);

  return (
    <div key={field.key} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-admin-text dark:text-white/80">{field.label}</p>
          {hint ? <p className="mt-1 text-xs text-admin-muted">{hint}</p> : null}
        </div>
        <AdminButton
          type="button"
          variant="outline"
          disabled={disabled || (field.maxItems != null && items.length >= field.maxItems)}
          onClick={() => onChange(addListItem(content, field))}
        >
          <Plus size={14} />
          Add {field.itemLabel}
        </AdminButton>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${field.key}-${index}`}
            className={[
              "rounded-xl border p-4",
              dark ? "border-white/10 bg-white/[0.03]" : "border-admin-border bg-admin-ivory/40",
            ].join(" ")}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-admin-text dark:text-white/85">
                {field.itemLabel} {index + 1}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  aria-label={`Move ${field.itemLabel} up`}
                  className="rounded-lg p-2 text-admin-muted transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
                  onClick={() => onChange(reorderListItem(content, field, index, -1))}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  disabled={disabled || index === items.length - 1}
                  aria-label={`Move ${field.itemLabel} down`}
                  className="rounded-lg p-2 text-admin-muted transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
                  onClick={() => onChange(reorderListItem(content, field, index, 1))}
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  disabled={
                    disabled || (field.minItems != null && items.length <= field.minItems)
                  }
                  aria-label={`Remove ${field.itemLabel}`}
                  className="rounded-lg p-2 text-admin-danger transition hover:bg-admin-danger/10 disabled:opacity-40"
                  onClick={() => onChange(removeListItem(content, field, index))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {field.fields
                .filter((subField) => !subField.hidden)
                .map((subField) => {
                  const raw = item[subField.key];
                  const subValue = typeof raw === "string" ? raw : String(raw ?? "");
                  const setSubValue = (value: string) =>
                    onChange(updateListItemField(content, field, index, subField.key, value));

                  if (subField.type === "image") {
                    return renderImageListField(subField, subValue, disabled, setSubValue);
                  }

                  return renderScalarField(subField, subValue, disabled, setSubValue);
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PageContentSectionForm({
  definition,
  content,
  disabled = false,
  onChange,
}: PageContentSectionFormProps) {
  const { dark } = useAdminTheme();

  return (
    <div className="space-y-4">
      {definition.fields.map((field: PageContentField) => {
        if (field.type === "cta") {
          const value = getCtaValue(content, field.key);
          return renderCtaField(field, value, disabled, (part, next) =>
            onChange(updateCtaField(content, field.key, part, next)),
          );
        }

        if (field.type === "list") {
          return renderListField(field, content, disabled, dark, onChange);
        }

        const rawScalar = content[field.key];
        const scalarValue =
          typeof rawScalar === "string" ? rawScalar : String(rawScalar ?? "");
        return renderScalarField(field, scalarValue, disabled, (value) =>
          onChange(updateScalarField(content, field.key, value)),
        );
      })}
    </div>
  );
}
