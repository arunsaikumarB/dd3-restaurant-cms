import { FormEvent, useCallback, useState } from "react";
import { usePageContent } from "../context/PageContentContext";
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

export function useContactForm() {
  const { fetchSection, interpolate } = usePageContent();
  const messages = fetchSection("contact", "form_messages", {
    validationName: "Please enter your name.",
    validationEmail: "Please enter a valid email address.",
    validationPhone: "Please enter your phone number.",
    validationMessage: "Please enter a message.",
    successTemplate: "Thank you, {name}. We'll be in touch shortly.",
    successFallback: "Thank you. We'll be in touch shortly.",
  });

  const [form, setForm] = useState<ContactFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (state: ContactFormState): string | null => {
      if (!state.name.trim()) return messages.validationName;
      if (!state.email.trim() || !state.email.includes("@")) {
        return messages.validationEmail;
      }
      if (!state.phone.trim()) return messages.validationPhone;
      if (!state.message.trim()) return messages.validationMessage;
      return null;
    },
    [messages],
  );

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
        await submitContact({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
        });
        setSubmitted(true);
        const firstName = form.name.trim().split(" ")[0];
        setSuccessMessage(
          interpolate(messages.successTemplate, { name: firstName }) ||
            messages.successFallback,
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, interpolate, messages, validate],
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
