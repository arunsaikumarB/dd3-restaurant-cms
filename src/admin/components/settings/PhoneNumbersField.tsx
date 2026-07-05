import { Plus, Trash2 } from "lucide-react";
import AdminInput from "../ui/Input";
import AdminButton from "../ui/Button";
import { MAX_RESTAURANT_PHONES, MIN_RESTAURANT_PHONES } from "../../../utils/restaurantPhones";

type Props = {
  phones: string[];
  error?: string;
  fieldErrors?: Partial<Record<number, string>>;
  disabled?: boolean;
  onChange: (phones: string[]) => void;
};

export default function PhoneNumbersField({
  phones,
  error,
  fieldErrors,
  disabled = false,
  onChange,
}: Props) {
  const updatePhone = (index: number, value: string) => {
    const next = [...phones];
    next[index] = value;
    onChange(next);
  };

  const addPhone = () => {
    if (phones.length >= MAX_RESTAURANT_PHONES) return;
    onChange([...phones, ""]);
  };

  const removePhone = (index: number) => {
    if (phones.length <= MIN_RESTAURANT_PHONES) return;
    onChange(phones.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-admin-text">Phone Numbers</p>
        <AdminButton
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || phones.length >= MAX_RESTAURANT_PHONES}
          onClick={addPhone}
        >
          <Plus size={16} aria-hidden />
          Add Phone
        </AdminButton>
      </div>

      <div className="space-y-3">
        {phones.map((phone, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1">
              <AdminInput
                label={phones.length > 1 ? `Phone ${index + 1}` : "Phone"}
                value={phone}
                disabled={disabled}
                error={fieldErrors?.[index]}
                onChange={(event) => updatePhone(index, event.target.value)}
              />
            </div>
            {phones.length > MIN_RESTAURANT_PHONES ? (
              <button
                type="button"
                className="mt-8 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-admin-border text-admin-muted transition-colors hover:border-admin-danger hover:text-admin-danger disabled:opacity-40"
                aria-label={`Remove phone ${index + 1}`}
                disabled={disabled}
                onClick={() => removePhone(index)}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-admin-danger">{error}</p> : null}
      <p className="text-xs text-admin-muted">
        Add up to {MAX_RESTAURANT_PHONES} numbers for this outlet. The first number is used as the
        primary contact.
      </p>
    </div>
  );
}
