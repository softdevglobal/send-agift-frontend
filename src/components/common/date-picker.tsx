import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/** `yyyy-mm-dd` for a date, in the viewer's own timezone rather than UTC. */
export function toDateValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** A date `days` from today, as `yyyy-mm-dd`. */
export function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateValue(date);
}

/** Parses `yyyy-mm-dd` as a local day, not a UTC instant. */
function parseDay(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Today", "Tomorrow", or "Fri, 3 Oct". A date a person can read. */
export function friendlyDate(value: string) {
  const date = parseDay(value);
  if (!date) return value;
  const days = Math.round(
    (date.getTime() - (parseDay(inDays(0))?.getTime() ?? 0)) / 86_400_000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Every day drawn in a month's grid, padded to whole weeks from Monday. */
function monthGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // getDay() is Sunday-first; the grid starts on Monday.
  const lead = (first.getDay() + 6) % 7;

  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export type DatePickerPreset = { label: string; days: number };

type DatePickerProps = {
  /** `yyyy-mm-dd`, or empty for no date chosen. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable day as `yyyy-mm-dd`. Defaults to today. */
  min?: string;
  /** One-tap options above the grid. */
  presets?: DatePickerPreset[];
  /** What the trigger says when nothing is chosen. */
  placeholder?: string;
  /** Wording for the button that clears the date. */
  clearLabel?: string;
  id?: string;
  className?: string;
};

/**
 * A month calendar in a popover, rather than whatever box the browser
 * happens to draw.
 *
 * The days a shopper cannot pick are visibly out of reach instead of being
 * refused after the fact, and the dates people actually ask for are one tap
 * above the grid.
 */
export function DatePicker({
  value,
  onChange,
  min,
  presets = [],
  placeholder = "Any day",
  clearLabel = "Any day",
  id,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Where the calendar sits on a wide screen, in viewport pixels. On a narrow
  // one it is a centred sheet instead and this goes unused.
  const [place, setPlace] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [narrow, setNarrow] = useState(false);

  const floor = min ?? inDays(0);
  const selected = parseDay(value);
  const [month, setMonth] = useState(
    () => selected ?? parseDay(floor) ?? new Date(),
  );

  // Reopening on a chosen date should land on that date's month, not
  // wherever the calendar was left last time.
  useEffect(() => {
    if (open && selected) setMonth(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The calendar is rendered into <body>, not inside the field. The search
  // bar blurs what is behind it, and a backdrop-filter makes a stacking
  // context of its own: anything drawn inside it, whatever its z-index, only
  // ranks inside the bar, so the product cards further down the page were
  // painting straight over the calendar. Out at the top of the document,
  // nothing on the page can sit on top of it or clip it.
  useLayoutEffect(() => {
    if (!open) return;
    function measure() {
      // Below the width at which the search bar stacks its fields (the lg:
      // grid in GiftSearchBar), the calendar is a sheet centred on the
      // screen, the way a phone shows one. Above it, it drops from the field.
      const isNarrow = window.innerWidth < 1024;
      setNarrow(isNarrow);
      if (isNarrow) return;

      const anchor = containerRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      const rect = anchor.getBoundingClientRect();
      const margin = 16;
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      const left = Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - margin - width),
      );
      // Below the field if it fits; above it if it would run off the bottom.
      const below = rect.bottom + 12;
      const top =
        below + height > window.innerHeight - margin &&
        rect.top - 12 - height > margin
          ? rect.top - 12 - height
          : below;
      setPlace({ top, left });
    }
    measure();
    window.addEventListener("resize", measure);
    // Fixed to the viewport, so it has to follow the field when the page
    // scrolls under it. Captured, to hear scrolls of any container too.
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      // The calendar lives in <body>, outside the field, so a tap on it is
      // not "outside" just because the field does not contain it.
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      // Stopped on `window`'s capture phase. Strictly before `document`'s,
      // regardless of add order. Or a Sheet/Dialog this opens inside
      // closes itself too: Radix's own Escape handling listens there.
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const cells = useMemo(() => monthGrid(month), [month]);
  const todayValue = inDays(0);

  // A month entirely before the floor has nothing to offer.
  const canGoBack =
    new Date(month.getFullYear(), month.getMonth(), 1) >
    new Date(
      parseDay(floor)?.getFullYear() ?? 0,
      parseDay(floor)?.getMonth() ?? 0,
      1,
    );

  function pick(day: Date) {
    onChange(toDateValue(day));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-7 w-full items-center text-left text-base",
          value ? "font-medium" : "text-muted-foreground",
        )}
      >
        {value ? friendlyDate(value) : placeholder}
      </button>

      {open
        ? createPortal(
            <>
              {/* On a phone the page dims behind the sheet, and a tap on the
                  dimmed part closes it. */}
              {narrow ? (
                <div
                  aria-hidden
                  onClick={() => setOpen(false)}
                  className="pointer-events-auto fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
                />
              ) : null}
              <div
                ref={popoverRef}
                role="dialog"
                aria-modal={narrow || undefined}
                aria-label="Choose a date"
                style={
                  narrow || !place
                    ? undefined
                    : { top: place.top, left: place.left }
                }
                className={cn(
                  // Radix's modal Dialog/Sheet sets pointer-events: none on
                  // <body> while open and only re-enables its own content, so
                  // a portal rendered as a body sibling needs it back.
                  "pointer-events-auto fixed z-[100] w-[19rem] max-w-[calc(100vw-2rem)]",
                  "rounded-2xl border border-border bg-surface p-3 shadow-2xl",
                  // Centred by the layout itself on a phone, so there is no
                  // arithmetic to get wrong.
                  narrow &&
                    "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                  // Invisible until measured on a wide screen, so it never flashes
                  // at the wrong spot for the frame before the numbers land.
                  !narrow && !place && "invisible",
                )}
              >
                {presets.length ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {presets.map((preset) => {
                      const presetValue = inDays(preset.days);
                      const picked = value === presetValue;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            onChange(presetValue);
                            setOpen(false);
                          }}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                            picked
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border/70 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                    aria-label="Previous month"
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <p className="text-sm font-semibold">
                    {month.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                    aria-label="Next month"
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {WEEKDAYS.map((day) => (
                    <span
                      key={day}
                      className="py-1 text-[0.7rem] font-semibold text-muted-foreground"
                    >
                      {day}
                    </span>
                  ))}

                  {cells.map((day, index) => {
                    if (!day) return <span key={`pad-${index}`} />;
                    const dayValue = toDateValue(day);
                    const disabled = dayValue < floor;
                    const picked = dayValue === value;
                    const isToday = dayValue === todayValue;
                    return (
                      <button
                        key={dayValue}
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(day)}
                        aria-current={isToday ? "date" : undefined}
                        className={cn(
                          "grid size-9 place-items-center rounded-xl text-sm transition",
                          disabled && "text-muted-foreground/35",
                          !disabled && !picked && "hover:bg-accent",
                          isToday && !picked && "font-semibold text-primary",
                          picked &&
                            "bg-primary font-semibold text-primary-foreground shadow-sm",
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                {value ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="mt-2 w-full rounded-xl py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {clearLabel}
                  </button>
                ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
