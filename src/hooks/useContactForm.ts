import { FormEvent, useCallback, useState } from "react";
import { submitContact } from "../services/contactApi";

export interface ContactFormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const initialState: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

function validate(form: ContactFormState): string | null {
  if (!form.name.trim()) return "Please enter your name.";
  if (!form.email.trim() || !form.email.includes("@")) {
    return "Please enter a valid email address.";
  }
  if (!form.phone.trim()) return "Please enter your phone number.";
  if (!form.message.trim()) return "Please enter a message.";
  return null;
}

export function useContactForm() {
  const [form, setForm] = useState<ContactFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    (key: keyof ContactFormState, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      const validationError = validate(form);
      if (validationError) {
        setError(validationError);
        return;
      }

      setSubmitting(true);
      try {
        const result = await submitContact({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
        });
        setSubmitted(true);
        setSuccessMessage(result.message);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form],
  );

  const reset = useCallback(() => {
    setForm(initialState);
    setSubmitted(false);
    setSuccessMessage("");
    setError(null);
  }, []);

  return {
    form,
    submitting,
    submitted,
    successMessage,
    error,
    updateField,
    handleSubmit,
    reset,
  };
}
