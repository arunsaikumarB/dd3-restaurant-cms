import type {
  PageContentCtaValue,
  PageContentField,
  PageContentListField,
  PageContentSectionDefinition,
  PageContentTextField,
} from "../config/pageContentSchema";

const TEMPLATE_HINTS: Record<string, string> = {
  name: "{name} is replaced with the outlet name on the site.",
  location: "{location} is replaced with the outlet short name on the site.",
  guests: "{guests} is replaced with the guest count on the site.",
};

export function getTemplatePlaceholderHint(label: string, helpText?: string): string | null {
  const source = `${label} ${helpText ?? ""}`;
  const keys = [...source.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  const unique = [...new Set(keys)];
  if (unique.length === 0) {
    return null;
  }

  return unique
    .map((key) => TEMPLATE_HINTS[key] ?? `{${key}} is replaced at runtime on the site.`)
    .join(" ");
}

function emptyTextField(_field: PageContentTextField): string {
  return "";
}

function emptyCtaField(): PageContentCtaValue {
  return { label: "", url: "" };
}

function emptyListItem(listField: PageContentListField): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const subField of listField.fields) {
    // All list sub-field types (text/textarea/image) are plain strings.
    item[subField.key] = "";
  }
  return item;
}

export function buildEmptySectionContent(
  definition: PageContentSectionDefinition,
): Record<string, unknown> {
  const content: Record<string, unknown> = {};

  for (const field of definition.fields) {
    if (field.type === "cta") {
      content[field.key] = emptyCtaField();
      continue;
    }
    if (field.type === "list") {
      const min = field.minItems ?? 0;
      content[field.key] = min > 0 ? Array.from({ length: min }, () => emptyListItem(field)) : [];
      continue;
    }
    content[field.key] = emptyTextField(field);
  }

  return content;
}

function normalizePillsForAdmin(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && "text" in entry) {
          return String((entry as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function denormalizePillsForSave(value: unknown): Array<{ text: string }> {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return { text: entry.trim() };
        if (entry && typeof entry === "object" && "text" in entry) {
          return { text: String((entry as { text?: unknown }).text ?? "").trim() };
        }
        return { text: "" };
      })
      .filter((entry) => entry.text.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  }

  return [];
}

function normalizeListItemForAdmin(
  item: unknown,
  listField: PageContentListField,
): Record<string, unknown> {
  const base = emptyListItem(listField);
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return base;
  }

  const record = item as Record<string, unknown>;
  for (const subField of listField.fields) {
    const raw = record[subField.key];
    if (subField.key === "pills") {
      base.pills = normalizePillsForAdmin(raw);
      continue;
    }
    base[subField.key] = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  }
  return base;
}

export function normalizeContentForAdmin(
  raw: Record<string, unknown>,
  definition: PageContentSectionDefinition,
): Record<string, unknown> {
  const empty = buildEmptySectionContent(definition);
  const merged: Record<string, unknown> = { ...empty };

  for (const field of definition.fields) {
    const rawValue = raw[field.key];

    if (field.type === "cta") {
      if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
        const cta = rawValue as Record<string, unknown>;
        merged[field.key] = {
          label: typeof cta.label === "string" ? cta.label : "",
          url: typeof cta.url === "string" ? cta.url : "",
        };
      }
      continue;
    }

    if (field.type === "list") {
      if (Array.isArray(rawValue) && rawValue.length > 0) {
        merged[field.key] = rawValue.map((item) => normalizeListItemForAdmin(item, field));
      }
      continue;
    }

    if (typeof rawValue === "string") {
      merged[field.key] = rawValue;
    } else if (rawValue != null && typeof rawValue !== "object") {
      merged[field.key] = String(rawValue);
    }
  }

  return merged;
}

function denormalizeListItemForSave(
  item: unknown,
  listField: PageContentListField,
): Record<string, unknown> {
  const base = emptyListItem(listField);
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return base;
  }

  const record = item as Record<string, unknown>;
  for (const subField of listField.fields) {
    const raw = record[subField.key];
    if (subField.key === "pills") {
      base.pills = denormalizePillsForSave(raw);
      continue;
    }
    base[subField.key] = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim();
  }
  return base;
}

export function denormalizeContentForSave(
  content: Record<string, unknown>,
  definition: PageContentSectionDefinition,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const field of definition.fields) {
    const value = content[field.key];

    if (field.type === "cta") {
      const cta =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as PageContentCtaValue)
          : emptyCtaField();
      output[field.key] = {
        label: cta.label.trim(),
        url: cta.url.trim(),
      };
      continue;
    }

    if (field.type === "list") {
      const items = Array.isArray(value) ? value : [];
      output[field.key] = items.map((item) => denormalizeListItemForSave(item, field));
      continue;
    }

    output[field.key] = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  }

  return output;
}

export function cloneSectionContent(content: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(content)) as Record<string, unknown>;
}

export function moveListItem(
  items: Record<string, unknown>[],
  index: number,
  direction: -1 | 1,
): Record<string, unknown>[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(nextIndex, 0, moved);
  return next;
}

export function validateSectionContent(
  content: Record<string, unknown>,
  definition: PageContentSectionDefinition,
): string | null {
  for (const field of definition.fields) {
    if (field.type !== "list") continue;
    const items = getListFieldItems(content, field);
    if (field.minItems != null && items.length < field.minItems) {
      return `${field.label} requires at least ${field.minItems} item(s).`;
    }
    if (field.maxItems != null && items.length > field.maxItems) {
      return `${field.label} allows at most ${field.maxItems} item(s).`;
    }

    for (const subField of field.fields) {
      if (!subField.required) continue;
      for (let index = 0; index < items.length; index++) {
        const raw = items[index][subField.key];
        const value = typeof raw === "string" ? raw.trim() : "";
        if (!value) {
          return `${subField.label} is required for ${field.itemLabel} ${index + 1}.`;
        }
      }
    }
  }
  return null;
}

export function getListFieldItems(
  content: Record<string, unknown>,
  field: PageContentListField,
): Record<string, unknown>[] {
  const value = content[field.key];
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

export function setListFieldItems(
  content: Record<string, unknown>,
  field: PageContentListField,
  items: Record<string, unknown>[],
): Record<string, unknown> {
  return { ...content, [field.key]: items };
}

export function updateScalarField(
  content: Record<string, unknown>,
  key: string,
  value: string,
): Record<string, unknown> {
  return { ...content, [key]: value };
}

export function updateCtaField(
  content: Record<string, unknown>,
  key: string,
  part: keyof PageContentCtaValue,
  value: string,
): Record<string, unknown> {
  const current =
    content[key] && typeof content[key] === "object" && !Array.isArray(content[key])
      ? (content[key] as PageContentCtaValue)
      : emptyCtaField();
  return {
    ...content,
    [key]: { ...current, [part]: value },
  };
}

export function updateListItemField(
  content: Record<string, unknown>,
  listField: PageContentListField,
  index: number,
  subKey: string,
  value: string,
): Record<string, unknown> {
  const items = [...getListFieldItems(content, listField)];
  const item = { ...(items[index] ?? emptyListItem(listField)), [subKey]: value };
  items[index] = item;
  return setListFieldItems(content, listField, items);
}

export function addListItem(
  content: Record<string, unknown>,
  listField: PageContentListField,
): Record<string, unknown> {
  const items = getListFieldItems(content, listField);
  if (listField.maxItems != null && items.length >= listField.maxItems) {
    return content;
  }
  return setListFieldItems(content, listField, [...items, emptyListItem(listField)]);
}

export function removeListItem(
  content: Record<string, unknown>,
  listField: PageContentListField,
  index: number,
): Record<string, unknown> {
  const items = getListFieldItems(content, listField);
  const min = listField.minItems ?? 0;
  if (items.length <= min) {
    return content;
  }
  return setListFieldItems(
    content,
    listField,
    items.filter((_, itemIndex) => itemIndex !== index),
  );
}

export function reorderListItem(
  content: Record<string, unknown>,
  listField: PageContentListField,
  index: number,
  direction: -1 | 1,
): Record<string, unknown> {
  const items = getListFieldItems(content, listField);
  return setListFieldItems(content, listField, moveListItem(items, index, direction));
}

export type { PageContentField };
