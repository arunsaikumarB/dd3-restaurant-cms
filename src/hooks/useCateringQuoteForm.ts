import { FormEvent, useCallback, useState } from "react";
import { usePageContent } from "../context/PageContentContext";
import { useLocationSelection } from "../context/LocationContext";
import { submitContact } from "../services/contactApi";

export interface CateringQuoteFormState {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  guestCount: string;
  message: string;
}

const initialState: CateringQuoteFormState = {
  name: "",
  email: "",
  phone: "",
  eventType: "",
  eventDate: "",
  guestCount: "",
  message: "",
};

export function useCateringQuoteForm() {
  const { fetchSection, interpolate } = usePageContent();
  const { selectedLocationId } = useLocationSelection();

  const messages = fetchSection("catering", "quote_form_messages", {
    validationName: "Please enter your name.",
    validationEmail: "Please enter a valid email address.",
    validationPhone: "Please enter your phone number.",
    validationEventType: "Please select an event type.",
    validationEventDate: "Please choose your event date.",
    validationGuestCount: "Please enter your expected guest count.",
    validationMessage: "Please share a few details about your event.",
    successTemplate: "Thank you, {name}. Our catering team will be in touch shortly.",
    successFallback: "Thank you. Our catering team will be in touch shortly.",
  });

  const [form, setForm] = useState<CateringQuoteFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (state: CateringQuoteFormState): string | null => {
      if (!state.name.trim()) return messages.validationName;
      if (!state.email.trim() || !state.email.includes("@")) {
        return messages.validationEmail;
      }
      if (!state.phone.trim()) return messages.validationPhone;
      if (!state.eventType.trim()) return messages.validationEventType;
      if (!state.eventDate.trim()) return messages.validationEventDate;
      if (!state.guestCount.trim()) return messages.validationGuestCount;
      if (!state.message.trim()) return messages.validationMessage;
      return null;
    },
    [messages],
  );

  const updateField = useCallback(
    (key: keyof CateringQuoteFormState, value: string) => {
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
          source: "catering",
          location_id: selectedLocationId,
          event_type: form.eventType.trim(),
          event_date: form.eventDate.trim(),
          guest_count: Number.parseInt(form.guestCount, 10),
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
    [form, interpolate, messages, selectedLocationId, validate],
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
