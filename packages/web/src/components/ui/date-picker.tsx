"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showQuickButtons?: boolean;
}

// Format date as YYYY-MM-DD for input value
function formatDateValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Format date for display
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

// Get quick date options
function getQuickDates(): { label: string; value: string; description?: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const nextMonday = new Date(today);
  const daysUntilMonday = ((1 - today.getDay()) + 7) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);

  const nextFriday = new Date(today);
  const daysUntilFriday = ((5 - today.getDay()) + 7) % 7 || 7;
  nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);

  const endOfWeek = new Date(today);
  const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return [
    { label: "Today", value: formatDateValue(today) },
    { label: "Tomorrow", value: formatDateValue(tomorrow) },
    { label: "In 2 days", value: formatDateValue(dayAfterTomorrow) },
    { label: "Next Monday", value: formatDateValue(nextMonday), description: formatDisplayDate(formatDateValue(nextMonday)) },
    { label: "Next Friday", value: formatDateValue(nextFriday), description: formatDisplayDate(formatDateValue(nextFriday)) },
    { label: "Next week", value: formatDateValue(nextWeek), description: formatDisplayDate(formatDateValue(nextWeek)) },
    { label: "End of month", value: formatDateValue(endOfMonth), description: formatDisplayDate(formatDateValue(endOfMonth)) },
  ];
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
  showQuickButtons = true,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update view when value changes
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const quickDates = getQuickDates();

  const handleQuickSelect = (dateValue: string) => {
    onChange(dateValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    // Get day of week (0=Sunday, 1=Monday, etc.) and convert to Monday-first (0=Monday, 6=Sunday)
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return (day + 6) % 7;
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(formatDateValue(selected));
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const date = new Date(value);
    return (
      date.getDate() === day &&
      date.getMonth() === viewDate.getMonth() &&
      date.getFullYear() === viewDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    );
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="grid grid-cols-7 gap-1 text-center" style={{ width: "224px" }}>
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
          <div key={day} className="w-7 text-[10px] text-zinc-500 font-medium py-1">
            {day}
          </div>
        ))}
        {days.map((day, idx) => (
          <button
            key={idx}
            type="button"
            disabled={day === null}
            onClick={() => day && handleDayClick(day)}
            className={`
              w-7 h-7 text-[11px] rounded transition-colors flex items-center justify-center
              ${day === null ? "invisible" : ""}
              ${isSelected(day!) ? "bg-blue-600 text-white" : ""}
              ${isToday(day!) && !isSelected(day!) ? "bg-zinc-700 text-zinc-200" : ""}
              ${!isSelected(day!) && !isToday(day!) && day !== null ? "hover:bg-zinc-700 text-zinc-300" : ""}
            `}
          >
            {day}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] bg-zinc-800 border border-zinc-700 rounded text-left hover:bg-zinc-750 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
        <span className={value ? "text-zinc-200" : "text-zinc-500"}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[280px]">
          <div className="flex">
            {/* Quick buttons */}
            {showQuickButtons && (
              <div className="border-r border-zinc-700 py-1.5 px-1.5 min-w-[100px]">
                {quickDates.map((quick) => (
                  <button
                    key={quick.label}
                    type="button"
                    onClick={() => handleQuickSelect(quick.value)}
                    className={`
                      w-full text-left px-1.5 py-0.5 text-[11px] rounded transition-colors
                      ${value === quick.value ? "bg-blue-600/20 text-blue-400" : "hover:bg-zinc-800 text-zinc-300"}
                    `}
                  >
                    {quick.label}
                    {quick.description && (
                      <span className="block text-[9px] text-zinc-500 leading-tight">{quick.description}</span>
                    )}
                  </button>
                ))}
                <hr className="border-zinc-700 my-1" />
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full text-left px-1.5 py-0.5 text-[11px] rounded transition-colors hover:bg-zinc-800 text-zinc-500"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Calendar */}
            <div className="p-2">
              {/* Month/Year header */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-zinc-400" />
                </button>
                <span className="text-[12px] font-medium text-zinc-200">
                  {viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>
              </div>

              {/* Calendar grid */}
              {renderCalendar()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
