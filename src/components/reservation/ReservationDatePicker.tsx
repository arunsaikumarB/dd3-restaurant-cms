import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<{ date: Date; inMonth: boolean }> = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let index = firstDay - 1; index >= 0; index -= 1) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - index),
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ date: new Date(year, month, day), inMonth: true });
  }

  while (days.length < 42) {
    const nextDay = days.length - firstDay - daysInMonth + 1;
    days.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
  }

  return days;
}

interface ReservationDatePickerProps {
  id: string;
  label: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
  icon: ReactNode;
}

export default function ReservationDatePicker({
  id,
  label,
  value,
  min,
  onChange,
  icon,
}: ReservationDatePickerProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selectedDate = parseIsoDate(value);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const minDate = parseIsoDate(min);
  const minMonthStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const viewMonthStart = new Date(viewYear, viewMonth, 1);
  const canGoPrev = viewMonthStart > minMonthStart;

  const calendarDays = useMemo(
    () => buildCalendarDays(viewYear, viewMonth),
    [viewMonth, viewYear],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const next = parseIsoDate(value);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }, [value]);

  const openPicker = () => {
    const next = parseIsoDate(value);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setOpen(true);
  };

  const goToPrevMonth = () => {
    if (!canGoPrev) return;
    const prev = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(prev.getFullYear());
    setViewMonth(prev.getMonth());
  };

  const goToNextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectDate = (date: Date) => {
    const iso = toIsoDate(date);
    if (iso < min) return;
    onChange(iso);
    setOpen(false);
  };

  const selectToday = () => {
    const today = toIsoDate(new Date());
    if (today < min) return;
    onChange(today);
    setOpen(false);
  };

  const todayIso = toIsoDate(new Date());

  return (
    <div
      ref={rootRef}
      className={"reservation-date-picker" + (open ? " reservation-date-picker--open" : "")}
    >
      <div className="reservation-field__control">
        <span className="reservation-field__icon" aria-hidden>
          {icon}
        </span>
        <button
          id={id}
          type="button"
          className="reservation-field__input reservation-date-picker__trigger"
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={`${label}: ${formatDisplayDate(value)}`}
        >
          {formatDisplayDate(value)}
        </button>
      </div>

      {open ? (
        <div
          id={listboxId}
          className="reservation-date-picker__panel"
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
        >
          <div className="reservation-date-picker__header">
            <button
              type="button"
              className="reservation-date-picker__nav"
              onClick={goToPrevMonth}
              disabled={!canGoPrev}
              aria-label="Previous month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <p className="reservation-date-picker__month">
              {MONTHS[viewMonth]} {viewYear}
            </p>

            <button
              type="button"
              className="reservation-date-picker__nav"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="reservation-date-picker__weekdays" aria-hidden>
            {WEEKDAYS.map((day) => (
              <span key={day} className="reservation-date-picker__weekday">
                {day}
              </span>
            ))}
          </div>

          <div className="reservation-date-picker__grid" role="grid" aria-label="Calendar days">
            {calendarDays.map(({ date, inMonth }) => {
              const iso = toIsoDate(date);
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              const isDisabled = iso < min;

              return (
                <button
                  key={iso + (inMonth ? "" : "-out")}
                  type="button"
                  role="gridcell"
                  className={
                    "reservation-date-picker__day" +
                    (inMonth ? "" : " reservation-date-picker__day--muted") +
                    (isSelected ? " reservation-date-picker__day--selected" : "") +
                    (isToday && !isSelected ? " reservation-date-picker__day--today" : "") +
                    (isDisabled ? " reservation-date-picker__day--disabled" : "")
                  }
                  onClick={() => selectDate(date)}
                  disabled={isDisabled}
                  aria-label={date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  aria-selected={isSelected}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="reservation-date-picker__footer">
            <button
              type="button"
              className="reservation-date-picker__footer-btn"
              onClick={selectToday}
              disabled={todayIso < min}
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
