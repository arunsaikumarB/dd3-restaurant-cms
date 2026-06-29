import { useCallback, useEffect, useState } from "react";
import { RESERVATION_LOCATIONS } from "../data/reservationPage";
import {
  fetchAvailableTimeSlots,
  submitReservation,
  type ReservationPayload,
  type TimeSlot,
} from "../services/reservationApi";

export interface ReservationFormState {
  locationId: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  email: string;
  specialRequests: string;
}

const MIN_GUESTS = 1;
const MAX_GUESTS = 20;

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const initialState: ReservationFormState = {
  locationId: RESERVATION_LOCATIONS[0].id,
  date: todayIso(),
  time: "",
  guests: 2,
  name: "",
  phone: "",
  email: "",
  specialRequests: "",
};

export function useReservation() {
  const [form, setForm] = useState<ReservationFormState>(initialState);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof ReservationFormState>(
      key: K,
      value: ReservationFormState[K],
    ) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "date" || key === "locationId") {
          next.time = "";
        }
        return next;
      });
      setError(null);
    },
    [],
  );

  const incrementGuests = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      guests: Math.min(MAX_GUESTS, prev.guests + 1),
    }));
  }, []);

  const decrementGuests = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      guests: Math.max(MIN_GUESTS, prev.guests - 1),
    }));
  }, []);

  useEffect(() => {
    if (!form.date || !form.locationId) {
      setTimeSlots([]);
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);

    fetchAvailableTimeSlots(form.locationId, form.date)
      .then((slots) => {
        if (!cancelled) {
          setTimeSlots(slots);
          setForm((prev) => {
            if (prev.time && slots.some((s) => s.value === prev.time && s.available)) {
              return prev;
            }
            const first = slots.find((s) => s.available);
            return first ? { ...prev, time: first.value } : { ...prev, time: "" };
          });
        }
      })
      .catch(() => {
        if (!cancelled) setTimeSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.date, form.locationId]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!form.date) {
      setError("Please select a date.");
      return;
    }
    if (!form.time) {
      setError("Please select a time slot.");
      return;
    }

    const payload: ReservationPayload = {
      locationId: form.locationId,
      date: form.date,
      time: form.time,
      guests: form.guests,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      specialRequests: form.specialRequests.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const result = await submitReservation(payload);
      setSubmitted(true);
      setSuccessMessage(result.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  const reset = useCallback(() => {
    setForm(initialState);
    setSubmitted(false);
    setSuccessMessage("");
    setError(null);
  }, []);

  return {
    form,
    timeSlots,
    loadingSlots,
    submitting,
    submitted,
    successMessage,
    error,
    minGuests: MIN_GUESTS,
    maxGuests: MAX_GUESTS,
    updateField,
    incrementGuests,
    decrementGuests,
    handleSubmit,
    reset,
  };
}
